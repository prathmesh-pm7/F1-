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
import { LiveSessionSnapshot, LiveConnectionState, RaceControlMessage, TimingEntry, TyreCompound } from '../types/f1';

const OPENF1_BASE = 'https://api.openf1.org/v1';

type JsonRecord = Record<string, any>;

interface ReplayLap {
  lapNumber: number;
  driverNumber: number;
  driverCode: string;
  driverName: string;
  lapTime: string;
  lapDuration?: number;
  dateStart?: string;
}

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
  public name = 'Replay Engine (latest completed race)';
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

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}`);
    return res.json() as Promise<T>;
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

  private async loadLatestRace(): Promise<void> {
    const year = new Date().getUTCFullYear();
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${year}&session_name=Race`);
    const now = Date.now();
    const completed = sessions
      .filter(s => Number.isFinite(new Date(String(s.date_start)).getTime()) && new Date(String(s.date_start)).getTime() < now)
      .sort((a, b) => new Date(String(b.date_start)).getTime() - new Date(String(a.date_start)).getTime());
    const match = completed[0];
    if (!match) throw new Error('No completed race is available for replay.');

    const key = Number(match.session_key);
    const [rawResults, rawLaps, rawDrivers, rawPositions, rawRaceControl, rawWeather, meetings] = await Promise.all([
      this.get<JsonRecord[]>(`/session_result?session_key=${key}`),
      this.get<JsonRecord[]>(`/laps?session_key=${key}`),
      this.get<JsonRecord[]>(`/drivers?session_key=${key}`),
      this.get<JsonRecord[]>(`/position?session_key=${key}`),
      this.get<JsonRecord[]>(`/race_control?session_key=${key}`),
      this.get<JsonRecord[]>(`/weather?session_key=${key}`),
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
      weather: rawWeather
    };

    this.recordedLaps = Array.from({ length: totalLaps }, (_, i) => i + 1);
    this.currentLapIndex = Math.max(0, this.recordedLaps.length - 1);
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

  private positionAtLapEnd(driverNumber: number, lap: number): number | null {
    if (!this.session) return null;
    const driverLaps = this.session.laps.filter(l => l.driverNumber === driverNumber && l.lapNumber === lap);
    const lap = driverLaps[0];
    if (!lap?.dateStart || !Number.isFinite(lap.lapDuration)) return null;
    const end = new Date(lap.dateStart).getTime() + Number(lap.lapDuration) * 1000;
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
    const position = this.positionAtLapEnd(driverNumber, lap) ?? Number(result.position) || 0;
    if (!position) return null;

    const teamName = String(d.team_name ?? '—');
    const teamColor = `#${String(d.team_colour ?? '59636E').replace('#', '')}`;
    const lapRows = this.session.laps.filter(l => l.driverNumber === driverNumber && l.lapNumber <= lap);
    const current = lapRows.find(l => l.lapNumber === lap);
    const lastLap = current?.lapTime ?? '—';

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
      tyre: { compound: 'UNKNOWN' as TyreCompound, age: 0 },
      stints: [],
      pitCount: 0,
      inPit: false,
      pitOut: false
    };
  }

  private generateSnapshot(lap: number): LiveSessionSnapshot {
    if (!this.session) return this.emptySnapshot();
    const entries = Array.from(this.session.drivers.keys())
      .map(number => this.entryFor(number, lap))
      .filter((entry): entry is TimingEntry => Boolean(entry))
      .sort((a, b) => a.position - b.position);

    const fastest = entries
      .filter(e => e.bestLapTime !== '—')
      .sort((a, b) => a.bestLapTime.localeCompare(b.bestLapTime))[0];

    const raceControl = this.session.raceControl
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
          sourceUrl: `${OPENF1_BASE}/race_control?session_key=${this.session.sessionKey}`,
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          isHistorical: true
        }
      }));

    const weather = this.session.weather[this.session.weather.length - 1] ?? {};
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
        rainfall: Boolean(weather.rainfall)
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
      weather: { airTemp: 0, trackTemp: 0, humidity: 0, pressure: 0, windSpeed: 0, windDirection: 0, rainfall: false },
      entries: [],
      raceControl: [],
      provenance: { provider: 'Provider Unavailable', retrievedAt: new Date().toISOString(), isLive: false, isFixture: false, notes: 'Loading historical replay' },
      connectionState: 'REPLAY',
      lastUpdated: new Date().toISOString()
    };
  }
}
