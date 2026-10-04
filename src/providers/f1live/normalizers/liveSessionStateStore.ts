import {
  LiveSessionSnapshot,
  TimingEntry,
  TrackStatus,
  Weather,
  RaceControlMessage,
  Driver
} from '../../../types/f1';
import { RawDriverTimingUpdate } from '../parsers/timingDataParser';

/**
 * LiveSessionStateStore maintains an in-memory session state and merges
 * incremental updates without fabricating missing values.
 */
export class LiveSessionStateStore {
  private snapshot: LiveSessionSnapshot;
  private driversMap = new Map<number, Partial<Driver>>();

  constructor() {
    this.snapshot = this.createInitialEmptySnapshot();
  }

  private createInitialEmptySnapshot(): LiveSessionSnapshot {
    return {
      sessionName: 'AWAITING TRACK SESSION',
      circuitName: 'CIRCUIT UNKNOWN',
      currentLap: 0,
      totalLaps: 0,
      remainingTimeStr: undefined,
      trackStatus: {
        status: '1',
        message: 'AWAITING TRACK FEED',
        flag: 'CLEAR',
        safetyCarDeployed: false,
        virtualSafetyCar: false,
        redFlag: false,
        updatedAt: new Date().toISOString()
      },
      weather: {
        airTemp: 0,
        trackTemp: 0,
        humidity: 0,
        pressure: 0,
        windSpeed: 0,
        windDirection: 0,
        rainfall: false,
        rainfallProbability: undefined
      },
      entries: [],
      raceControl: [],
      provenance: {
        provider: 'F1 Live Timing (SignalR)',
        retrievedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        isLive: true,
        isFixture: false,
        notes: 'Live SignalR stream'
      },
      connectionState: 'CONNECTING',
      lastUpdated: new Date().toISOString()
    };
  }

  public getSnapshot(): LiveSessionSnapshot {
    return { ...this.snapshot };
  }

  public reset() {
    this.snapshot = this.createInitialEmptySnapshot();
    this.driversMap.clear();
  }

  public setConnectionState(state: LiveSessionSnapshot['connectionState'], note?: string) {
    this.snapshot.connectionState = state;
    this.snapshot.lastUpdated = new Date().toISOString();
    if (note) this.snapshot.provenance.notes = note;
  }

  public mergeDriversList(map: Map<number, Partial<Driver>>) {
    for (const [num, driver] of map.entries()) {
      const existing = this.driversMap.get(num) || {};
      this.driversMap.set(num, { ...existing, ...driver });
    }

    this.snapshot.entries = this.snapshot.entries.map(entry => {
      const info = this.driversMap.get(entry.driverNumber);
      if (!info) return entry;
      return {
        ...entry,
        driverCode: info.code || entry.driverCode,
        driverName: info.fullName || entry.driverName,
        teamName: info.teamName || entry.teamName,
        teamColor: info.teamColor || entry.teamColor
      };
    });
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeTrackStatus(status: TrackStatus) {
    this.snapshot.trackStatus = status;
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeWeather(incoming: Weather) {
    const current = this.snapshot.weather;

    // WeatherData can be incremental. Never replace a real sensor value with
    // the parser's "0 = not supplied" sentinel.
    this.snapshot.weather = {
      airTemp: incoming.airTemp > 0 ? incoming.airTemp : current.airTemp,
      trackTemp: incoming.trackTemp > 0 ? incoming.trackTemp : current.trackTemp,
      humidity: incoming.humidity > 0 ? incoming.humidity : current.humidity,
      pressure: incoming.pressure > 0 ? incoming.pressure : current.pressure,
      windSpeed: incoming.windSpeed > 0 ? incoming.windSpeed : current.windSpeed,
      windDirection: incoming.windDirection > 0 ? incoming.windDirection : current.windDirection,
      rainfall: incoming.rainfall,
      rainfallProbability: incoming.rainfallProbability !== undefined
        ? incoming.rainfallProbability
        : current.rainfallProbability
    };
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeRaceControlMessages(messages: RaceControlMessage[]) {
    if (messages.length === 0) return;
    const existingIds = new Set(this.snapshot.raceControl.map(message => message.id));
    const newMessages = messages.filter(message => !existingIds.has(message.id));
    this.snapshot.raceControl = [...newMessages, ...this.snapshot.raceControl].slice(0, 100);
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeSessionInfo(info: { sessionName?: string; circuitName?: string; totalLaps?: number; currentLap?: number }) {
    if (info.sessionName) this.snapshot.sessionName = info.sessionName;
    if (info.circuitName) this.snapshot.circuitName = info.circuitName;
    if (info.totalLaps !== undefined && info.totalLaps > 0) this.snapshot.totalLaps = info.totalLaps;
    if (info.currentLap !== undefined && info.currentLap > 0) {
      this.snapshot.currentLap = info.currentLap;
      this.snapshot.remainingTimeStr = `LAP ${info.currentLap} / ${this.snapshot.totalLaps || '—'}`;
    }
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeTimingData(updates: RawDriverTimingUpdate[]) {
    if (updates.length === 0) return;

    const entriesMap = new Map<number, TimingEntry>();
    for (const entry of this.snapshot.entries) entriesMap.set(entry.driverNumber, { ...entry });

    for (const update of updates) {
      let entry = entriesMap.get(update.driverNumber);
      const driverInfo = this.driversMap.get(update.driverNumber);

      if (!entry) {
        entry = {
          position: update.position || entriesMap.size + 1,
          driverNumber: update.driverNumber,
          driverCode: driverInfo?.code || `D${update.driverNumber}`,
          driverName: driverInfo?.fullName || `Driver #${update.driverNumber}`,
          teamName: driverInfo?.teamName || 'TEAM —',
          teamColor: driverInfo?.teamColor || '#59636E',
          gap: update.gap || '—',
          interval: update.interval || '—',
          gapToLeaderSeconds: Number.NaN,
          intervalSeconds: Number.NaN,
          currentLap: update.currentLap || this.snapshot.currentLap || 1,
          lastLapTime: update.lastLapTime || '—',
          bestLapTime: update.bestLapTime || '—',
          isOverallFastestLap: update.isOverallFastestLap,
          sectors: [
            { sector: 1, timeStr: '—', status: 'unknown' },
            { sector: 2, timeStr: '—', status: 'unknown' },
            { sector: 3, timeStr: '—', status: 'unknown' }
          ],
          currentSector: 1,
          tyre: { compound: 'UNKNOWN', age: 0 },
          stints: [],
          pitCount: update.pitCount ?? 0,
          inPit: update.inPit,
          retired: update.retired
        };
      }

      if (update.position !== undefined) entry.position = update.position;
      if (update.gap !== undefined) entry.gap = update.gap;
      if (update.interval !== undefined) entry.interval = update.interval;
      if (update.currentLap !== undefined) entry.currentLap = update.currentLap;
      if (update.lastLapTime !== undefined) entry.lastLapTime = update.lastLapTime;
      if (update.bestLapTime !== undefined) entry.bestLapTime = update.bestLapTime;
      if (update.isOverallFastestLap !== undefined) entry.isOverallFastestLap = update.isOverallFastestLap;
      if (update.sector1) entry.sectors[0] = { ...entry.sectors[0], ...update.sector1 };
      if (update.sector2) entry.sectors[1] = { ...entry.sectors[1], ...update.sector2 };
      if (update.sector3) entry.sectors[2] = { ...entry.sectors[2], ...update.sector3 };
      if (update.inPit !== undefined) entry.inPit = update.inPit;
      if (update.retired !== undefined) entry.retired = update.retired;
      if (update.pitCount !== undefined) entry.pitCount = update.pitCount;
      if (update.speedTrapKmH !== undefined) entry.speedTrapKmH = update.speedTrapKmH;

      entriesMap.set(update.driverNumber, entry);
    }

    this.snapshot.entries = Array.from(entriesMap.values()).sort((a, b) => a.position - b.position);
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeTimingAppData(appData: Map<number, { compound: any; age: number }>) {
    this.snapshot.entries = this.snapshot.entries.map(entry => {
      const data = appData.get(entry.driverNumber);
      if (!data) return entry;
      return {
        ...entry,
        tyre: {
          compound: data.compound,
          age: data.age
        }
      };
    });
    this.snapshot.lastUpdated = new Date().toISOString();
  }
}
