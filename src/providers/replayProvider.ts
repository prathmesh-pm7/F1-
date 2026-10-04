/**
 * Historical session replay provider.
 *
 * Uses real OpenF1 historical data (2023+) and automatically selects the
 * latest completed race. No random/interpolated timing is generated.
 *
 * Replay positions are reconstructed from the official session timing
 * records exposed by OpenF1: for each lap we use the latest recorded
 * position at or before that lap's end timestamp.
 */

import { F1LiveProvider } from './types';
import { LiveSessionSnapshot, LiveConnectionState, RaceControlMessage, TimingEntry, TyreCompound, TyreStint, LapTelemetry } from '../types/f1';
import { GrandPrix, SessionSchedule } from '../types/f1';

const OPENF1_BASE = 'https://api.openf1.org/v1';

type JsonRecord = Record<string, any>;

type ReplayLap = LapTelemetry;

interface ReplaySession {
  sessionKey: number;
  sessionName: string;
  circuitName: string;
  meetingName: string;
  meetingCountry: string;
  totalLaps: number;
  laps: ReplayLap[];
  results: JsonRecord[];
  drivers: Map<number, JsonRecord>;
  positions: JsonRecord[];
  raceControl: JsonRecord[];
  weather: JsonRecord[];
  stints: JsonRecord[];
  pitStops: JsonRecord[];
}

const formatSeconds = (value: unknown): string => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const minutes = Math.floor(n / 60);
  return `${minutes}:${(n - minutes * 60).toFixed(3).padStart(6, '0')}`;
};

const emptySector = (sector: 1 | 2 | 3) => ({
  sector,
  timeStr: '—',
  status: 'unknown' as const
});

export class ReplayProvider implements F1LiveProvider {
  public name = 'Replay Engine (historical race archive)';
  private state: LiveConnectionState = 'REPLAY';
  private snapshotListeners: ((snapshot: LiveSessionSnapshot) => void)[] = [];
  private stateListeners: ((state: LiveConnectionState, reason?: string) => void)[] = [];
  private rcListeners: ((msg: RaceControlMessage) => void)[] = [];

  private session: ReplaySession | null = null;
  private recordedLaps: number[] = [];
  private currentLapIndex = 0;
  private isPlaying = false;
  private playbackSpeed = 1;
  private timer: any = null;
  private loadingPromise: Promise<void> | null = null;
  private cache = new Map<string, { data: any; expiry: number }>();
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;
  private minRequestGap = 350;

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  private async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) return cached.data as T;

    let release!: () => void;
    const turn = new Promise<void>(resolve => { release = resolve; });
    const previous = this.requestQueue;
    this.requestQueue = previous.then(() => turn);
    await previous;
    try {
      const gap = Date.now() - this.lastRequestAt;
      if (gap < this.minRequestGap) await this.sleep(this.minRequestGap - gap);

      let res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
      this.lastRequestAt = Date.now();
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 15_000)
          : 5_000;
        await this.sleep(waitMs);
        res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
        this.lastRequestAt = Date.now();
      }
      if (!res.ok) {
        if (res.status === 429) throw new Error('OpenF1 rate limited. Please retry in a few seconds.');
        throw new Error(`OpenF1 HTTP ${res.status}`);
      }
      const data = await res.json();
      this.cache.set(path, { data, expiry: Date.now() + 5 * 60_000 });
      return data as T;
    } finally {
      release();
    }
  }

  public async connect(): Promise<void> {
    this.state = 'REPLAY';
    this.notifyState();
    if (!this.session) {
      if (!this.loadingPromise) this.loadingPromise = this.loadLatestRace().finally(() => { this.loadingPromise = null; });
      await this.loadingPromise;
    }
    this.currentLapIndex = Math.min(this.currentLapIndex, Math.max(0, this.recordedLaps.length - 1));
    this.broadcastSnapshot();
  }

  public disconnect(): void {
    this.pause();
    this.state = 'DISCONNECTED';
    this.notifyState('Replay stopped');
  }

  public getState(): LiveConnectionState { return this.state; }

  public getLastUpdated(): string | null {
    return this.session ? new Date().toISOString() : null;
  }

  public onSnapshot(callback: (snapshot: LiveSessionSnapshot) => void): () => void {
    this.snapshotListeners.push(callback);
    if (this.session) callback(this.generateSnapshot(this.getCurrentLap()));
    return () => { this.snapshotListeners = this.snapshotListeners.filter(l => l !== callback); };
  }

  public onStateChange(callback: (state: LiveConnectionState, reason?: string) => void): () => void {
    this.stateListeners.push(callback);
    callback(this.state);
    return () => { this.stateListeners = this.stateListeners.filter(l => l !== callback); };
  }

  public onRaceControlMessage(callback: (msg: RaceControlMessage) => void): () => void {
    this.rcListeners.push(callback);
    return () => { this.rcListeners = this.rcListeners.filter(l => l !== callback); };
  }

  public play() {
    if (this.isPlaying || !this.session) return;
    this.isPlaying = true;
    this.runLoop();
  }

  public pause() {
    this.isPlaying = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  public setSpeed(speed: number) { this.playbackSpeed = speed; }

  public stepLap(delta: number) {
    if (!this.recordedLaps.length) return;
    const next = Math.max(0, Math.min(this.recordedLaps.length - 1, this.currentLapIndex + delta));
    if (next !== this.currentLapIndex) {
      this.currentLapIndex = next;
      this.broadcastSnapshot();
    }
  }

  public jumpToLap(lap: number) {
    if (!this.recordedLaps.length) return;
    let closest = 0;
    let diff = Infinity;
    this.recordedLaps.forEach((value, index) => {
      const d = Math.abs(value - lap);
      if (d < diff) { diff = d; closest = index; }
    });
    this.currentLapIndex = closest;
    this.broadcastSnapshot();
  }

  public isRunning(): boolean { return this.isPlaying; }
  public getCurrentLap(): number { return this.recordedLaps[this.currentLapIndex] ?? 0; }
  public getRecordedLaps(): number[] { return [...this.recordedLaps]; }
  public getPlaybackSpeed(): number { return this.playbackSpeed; }
  public getSnapshot(): LiveSessionSnapshot {
    return this.session ? this.generateSnapshot(this.getCurrentLap()) : this.emptySnapshot();
  }

  public getCompletedLaps(upToLap?: number): LapTelemetry[] {
    if (!this.session) return [];
    const maxLap = upToLap ?? this.getCurrentLap();
    return this.session.laps.filter(l => l.lapNumber <= maxLap);
  }

  public async loadRace(gp: GrandPrix, session: SessionSchedule): Promise<void> {
    this.pause();
    // Clear the previous replay immediately. If a historical request fails or is
    // rate-limited, the UI must never continue displaying the previous race as if
    // it were the newly selected weekend.
    this.session = null;
    this.recordedLaps = [];
    this.currentLapIndex = 0;
    this.broadcastSnapshot();
    const wanted = encodeURIComponent('Race');
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${gp.season}&session_name=${wanted}`);
    const target = new Date(session.startTime).getTime();
    const tolerance = 36 * 60 * 60 * 1000;
    const candidates = sessions
      .filter(s => String(s.session_name ?? '').toLowerCase() === 'race')
      .filter(s => Number.isFinite(new Date(String(s.date_start)).getTime()));
    const match = candidates
      .filter(s => Math.abs(new Date(String(s.date_start)).getTime() - target) <= tolerance)
      .sort((a, b) => Math.abs(new Date(String(a.date_start)).getTime() - target) - Math.abs(new Date(String(b.date_start)).getTime() - target))[0];
    if (!match) throw new Error(`Race replay data is not published for ${gp.officialName}.`);
    await this.loadSessionRecord(match, gp.season);
    this.state = 'REPLAY';
    this.notifyState();
    this.broadcastSnapshot();
  }

  private async loadLatestRace(): Promise<void> {
    const year = new Date().getUTCFullYear();
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${year}&session_name=Race`);
    const now = Date.now();
    const completed = sessions
      .filter(s => Number.isFinite(new Date(String(s.date_start)).getTime()) && new Date(String(s.date_start)).getTime() < now)
      .sort((a, b) => new Date(String(b.date_start)).getTime() - new Date(String(a.date_start)).getTime());
    const match = completed[0];
    if (!match) throw new Error('No completed race is available for replay.');
    await this.loadSessionRecord(match, year);
  }

  private async loadSessionRecord(match: JsonRecord, year: number): Promise<void> {
    const key = Number(match.session_key);
    const [rawResults, rawLaps, rawDrivers, rawPositions, rawRaceControl, rawWeather, rawStints, rawPitStops, meetings] = await Promise.all([
      this.get<JsonRecord[]>(`/session_result?session_key=${key}`),
      this.get<JsonRecord[]>(`/laps?session_key=${key}`),
      this.get<JsonRecord[]>(`/drivers?session_key=${key}`),
      this.get<JsonRecord[]>(`/position?session_key=${key}`),
      this.get<JsonRecord[]>(`/race_control?session_key=${key}`),
      this.get<JsonRecord[]>(`/weather?session_key=${key}`),
      this.get<JsonRecord[]>(`/stints?session_key=${key}`),
      this.get<JsonRecord[]>(`/pit?session_key=${key}`),
      this.get<JsonRecord[]>(`/meetings?year=${year}`)
    ]);

    const drivers = new Map<number, JsonRecord>();
    rawDrivers.forEach(d => drivers.set(Number(d.driver_number), d));

    const laps: ReplayLap[] = rawLaps
      .map(l => {
        const number = Number(l.driver_number);
        const d = drivers.get(number) ?? {};
        const duration = Number(l.lap_duration);
        return {
          lapNumber: Number(l.lap_number),
          driverNumber: number,
          driverCode: String(d.name_acronym ?? '???'),
          driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'),
          lapTime: formatSeconds(duration),
          lapDuration: Number.isFinite(duration) ? duration : undefined,
          dateStart: String(l.date_start ?? '')
        };
      })
      .filter(l => l.lapNumber > 0)
      .sort((a, b) => a.lapNumber - b.lapNumber);

    const totalLaps = Math.max(0, ...rawResults.map(r => Number(r.number_of_laps) || 0), ...laps.map(l => l.lapNumber));
    const meeting = meetings.find(m => Number(m.meeting_key) === Number(match.meeting_key)) ?? meetings[0] ?? {};

    this.session = {
      sessionKey: key,
      sessionName: String(match.session_name ?? 'Race'),
      circuitName: String(match.circuit_short_name ?? meeting.circuit_short_name ?? 'Circuit'),
      meetingName: String(meeting.meeting_name ?? meeting.meeting_official_name ?? 'Grand Prix'),
      meetingCountry: String(meeting.country_name ?? ''),
      totalLaps,
      laps,
      results: rawResults,
      drivers,
      positions: rawPositions,
      raceControl: rawRaceControl,
      weather: rawWeather,
      stints: rawStints,
      pitStops: rawPitStops
    };

    this.recordedLaps = Array.from({ length: totalLaps }, (_, i) => i + 1);
    // Start a selected replay at lap 1 rather than silently jumping to the finish.
    this.currentLapIndex = 0;
  }

  private runLoop() {
    if (!this.isPlaying || !this.session) return;
    const interval = Math.max(700, 3000 / this.playbackSpeed);
    this.timer = setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.currentLapIndex < this.recordedLaps.length - 1) {
        this.currentLapIndex++;
        this.broadcastSnapshot();
        this.runLoop();
      } else this.pause();
    }, interval);
  }

  private notifyState(reason?: string) {
    this.stateListeners.forEach(l => l(this.state, reason));
  }

  private broadcastSnapshot() {
    const snap = this.getSnapshot();
    this.snapshotListeners.forEach(l => l(snap));
  }

  private selectWeatherAtOrBefore(timestamp: number): JsonRecord {
    const valid = this.session?.weather.filter(row => Number.isFinite(new Date(String(row.date ?? '')).getTime())) ?? [];
    if (!valid.length) return {};
    if (!Number.isFinite(timestamp) || timestamp <= 0) return valid[0];
    return valid.reduce((selected, row) => {
      const rowTime = new Date(String(row.date ?? '')).getTime();
      const selectedTime = new Date(String(selected.date ?? '')).getTime();
      if (rowTime <= timestamp && (selectedTime > timestamp || rowTime > selectedTime)) return row;
      return selected;
    }, valid[0]);
  }

  private positionAtLapEnd(driverNumber: number, lap: number): number | null {
    if (!this.session) return null;
    const driverLaps = this.session.laps.filter(l => l.driverNumber === driverNumber && l.lapNumber === lap);
    const lapRecord = driverLaps[0];
    if (!lapRecord?.dateStart || !Number.isFinite(lapRecord.lapDuration)) return null;
    const end = new Date(lapRecord.dateStart).getTime() + Number(lapRecord.lapDuration) * 1000;
    const candidates = this.session.positions
      .filter(p => Number(p.driver_number) === driverNumber && new Date(String(p.date)).getTime() <= end)
      .sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime());
    return candidates.length ? Number(candidates[0].position) : null;
  }

  private bestLap(driverNumber: number): string {
    if (!this.session) return '—';
    const times = this.session.laps.filter(l => l.driverNumber === driverNumber && l.lapDuration && l.lapDuration > 0).map(l => l.lapDuration as number);
    return times.length ? formatSeconds(Math.min(...times)) : '—';
  }

  private entryFor(driverNumber: number, lap: number): TimingEntry | null {
    if (!this.session) return null;
    const d = this.session.drivers.get(driverNumber) ?? {};
    const result = this.session.results.find(r => Number(r.driver_number) === driverNumber) ?? {};
    const position = this.positionAtLapEnd(driverNumber, lap);
    if (!position) return null;

    const teamName = String(d.team_name ?? '—');
    const teamColor = `#${String(d.team_colour ?? '59636E').replace('#', '')}`;
    const lapRows = this.session.laps.filter(l => l.driverNumber === driverNumber && l.lapNumber <= lap);
    const current = lapRows.find(l => l.lapNumber === lap);
    const lastLap = current?.lapTime ?? '—';
    const stints: TyreStint[] = this.session.stints
      .filter(s => Number(s.driver_number) === driverNumber && Number(s.lap_start ?? 0) <= lap)
      .sort((a, b) => Number(a.stint_number ?? 0) - Number(b.stint_number ?? 0))
      .map(s => ({
        stintNumber: Number(s.stint_number ?? 0),
        compound: String(s.compound ?? 'UNKNOWN').toUpperCase() as TyreCompound,
        lapsUsed: Math.max(0, Math.min(lap, Number(s.lap_end ?? lap)) - Number(s.lap_start ?? 1) + 1),
        startLap: Number(s.lap_start ?? 0),
        endLap: Number(s.lap_end ?? 0) || undefined,
        isNew: Boolean(s.tyre_age_at_start === 0)
      }));
    const pits = this.session.pitStops.filter(p => Number(p.driver_number) === driverNumber && Number(p.lap_number ?? 0) <= lap);

    return {
      position,
      driverNumber,
      driverCode: String(d.name_acronym ?? '???'),
      driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'),
      teamName,
      teamColor,
      gap: Number(result.position) === 1 ? 'LEADER' : (result.gap_to_leader == null ? '—' : String(result.gap_to_leader)),
      interval: '—',
      gapToLeaderSeconds: Number(result.gap_to_leader) || undefined,
      currentLap: lap,
      lastLapTime: lastLap,
      bestLapTime: this.bestLap(driverNumber),
      sectors: [emptySector(1), emptySector(2), emptySector(3)],
      currentSector: 1,
      tyre: (() => {
        const currentStint = stints.find(s => s.startLap <= lap && (!s.endLap || lap <= s.endLap)) ?? stints[stints.length - 1];
        return { compound: currentStint?.compound ?? 'UNKNOWN' as TyreCompound, age: currentStint ? Math.max(0, lap - currentStint.startLap + 1) : 0 };
      })(),
      stints,
      pitCount: pits.length,
      lastPitLap: pits.length ? Number(pits[pits.length - 1].lap_number) : undefined,
      inPit: false,
      pitOut: false
    };
  }

  private generateSnapshot(lap: number): LiveSessionSnapshot {
    if (!this.session) return this.emptySnapshot();
    const session = this.session;
    const entries = Array.from(this.session.drivers.keys())
      .map(number => this.entryFor(number, lap))
      .filter((entry): entry is TimingEntry => Boolean(entry))
      .sort((a, b) => a.position - b.position);

    const fastest = entries
      .filter(e => e.bestLapTime !== '—')
      .sort((a, b) => {
        const parse = (value: string) => {
          const parts = value.split(':').map(Number);
          return parts.length === 2 ? parts[0] * 60 + parts[1] : Number(value);
        };
        return parse(a.bestLapTime) - parse(b.bestLapTime);
      })[0];

    const raceControl: RaceControlMessage[] = this.session.raceControl
      .filter(m => Number(m.lap_number ?? 0) === 0 || Number(m.lap_number ?? 0) <= lap)
      .slice(-50)
      .map((m, i) => ({
        id: `replay-${i}-${m.date ?? ''}`,
        time: String(m.date ?? ''),
        lap: Number(m.lap_number) || undefined,
        category: 'INFO' as const,
        flag: undefined,
        message: String(m.message ?? m.category ?? 'Race control update'),
        provenance: {
          provider: 'OpenF1',
          sourceUrl: `${OPENF1_BASE}/race_control?session_key=${session.sessionKey}`,
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          isHistorical: true
        }
      }));

    const replayTimestamp = Math.max(
      0,
      ...this.session.laps
        .filter(l => l.lapNumber <= lap && l.dateStart && Number.isFinite(l.lapDuration))
        .map(l => new Date(l.dateStart!).getTime() + Number(l.lapDuration) * 1000)
    );
    const weather = this.selectWeatherAtOrBefore(replayTimestamp);
    return {
      sessionName: `${this.session.meetingName} · ${this.session.sessionName}`,
      circuitName: this.session.circuitName,
      currentLap: lap,
      totalLaps: this.session.totalLaps,
      remainingTimeStr: `LAP ${lap} / ${this.session.totalLaps}`,
      trackStatus: {
        status: '1',
        message: 'RECORDED SESSION',
        flag: 'GREEN',
        safetyCarDeployed: false,
        virtualSafetyCar: false,
        redFlag: false,
        updatedAt: String(weather.date ?? '')
      },
      weather: {
        airTemp: Number(weather.air_temperature) || 0,
        trackTemp: Number(weather.track_temperature) || 0,
        humidity: Number(weather.humidity) || 0,
        pressure: Number(weather.pressure) || 0,
        windSpeed: Number(weather.wind_speed) || 0,
        windDirection: Number(weather.wind_direction) || 0,
        rainfall: Boolean(weather.rainfall),
        rainfallProbability: (() => {
          const rawProb = weather.rainfall_probability ?? weather.rain_probability ?? weather.RainfallProbability ?? weather.RainProbability;
          if (rawProb !== undefined && Number.isFinite(Number(rawProb))) return Number(rawProb);
          return Boolean(weather.rainfall) ? 100 : 0;
        })()
      },
      entries,
      fastestLap: fastest ? { driverCode: fastest.driverCode, time: fastest.bestLapTime, lap } : undefined,
      raceControl,
      provenance: {
        provider: 'OpenF1',
        sourceUrl: `${OPENF1_BASE}/session_result?session_key=${this.session.sessionKey}`,
        retrievedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        isLive: false,
        isFixture: false,
        isHistorical: true,
        notes: `Recorded OpenF1 replay: ${this.session.meetingName}`
      },
      connectionState: 'REPLAY',
      lastUpdated: new Date().toISOString()
    };
  }

  private emptySnapshot(): LiveSessionSnapshot {
    return {
      sessionName: 'LOADING RECORDED SESSION',
      circuitName: 'CIRCUIT —',
      currentLap: 0,
      totalLaps: 0,
      trackStatus: { status: '1', message: 'LOADING', flag: 'CLEAR', safetyCarDeployed: false, virtualSafetyCar: false, redFlag: false, updatedAt: new Date().toISOString() },
      weather: { airTemp: 0, trackTemp: 0, humidity: 0, pressure: 0, windSpeed: 0, windDirection: 0, rainfall: false, rainfallProbability: 0 },
      entries: [],
      raceControl: [],
      provenance: { provider: 'Provider Unavailable', retrievedAt: new Date().toISOString(), isLive: false, isFixture: false, notes: 'Loading historical replay' },
      connectionState: 'REPLAY',
      lastUpdated: new Date().toISOString()
    };
  }
}
