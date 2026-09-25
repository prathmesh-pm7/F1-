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
 * LiveSessionStateStore maintains an in-memory session state
 * and merges incremental updates without fabricating missing values.
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
        pressure: 1013,
        windSpeed: 0,
        windDirection: 0,
        rainfall: false
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
    if (note) {
      this.snapshot.provenance.notes = note;
    }
  }

  public mergeDriversList(map: Map<number, Partial<Driver>>) {
    for (const [num, driver] of map.entries()) {
      const existing = this.driversMap.get(num) || {};
      this.driversMap.set(num, { ...existing, ...driver });
    }
    // Update any existing timing entries with newly arrived driver info
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

  public mergeWeather(weather: Weather) {
    this.snapshot.weather = weather;
    this.snapshot.lastUpdated = new Date().toISOString();
  }

  public mergeRaceControlMessages(messages: RaceControlMessage[]) {
    if (messages.length === 0) return;
    const existingIds = new Set(this.snapshot.raceControl.map(m => m.id));
    const newMsgs = messages.filter(m => !existingIds.has(m.id));
    this.snapshot.raceControl = [...newMsgs, ...this.snapshot.raceControl].slice(0, 100);
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
    for (const e of this.snapshot.entries) {
      entriesMap.set(e.driverNumber, { ...e });
    }

    for (const u of updates) {
      let entry = entriesMap.get(u.driverNumber);
      const driverInfo = this.driversMap.get(u.driverNumber);

      if (!entry) {
        // Create initial entry with known/derived driver details
        entry = {
          position: u.position || entriesMap.size + 1,
          driverNumber: u.driverNumber,
          driverCode: driverInfo?.code || `D${u.driverNumber}`,
          driverName: driverInfo?.fullName || `Driver #${u.driverNumber}`,
          teamName: driverInfo?.teamName || 'Formula 1 Team',
          teamColor: driverInfo?.teamColor || '#E10600',
          gap: u.gap || '—',
          interval: u.interval || '—',
          gapToLeaderSeconds: 0,
          intervalSeconds: 0,
          currentLap: u.currentLap || this.snapshot.currentLap || 1,
          lastLapTime: u.lastLapTime || '—',
          bestLapTime: u.bestLapTime || '—',
          isOverallFastestLap: u.isOverallFastestLap,
          sectors: [
            { sector: 1, timeStr: '—', status: 'unknown' },
            { sector: 2, timeStr: '—', status: 'unknown' },
            { sector: 3, timeStr: '—', status: 'unknown' }
          ],
          currentSector: 1,
          tyre: { compound: 'UNKNOWN', age: 0 },
          stints: [],
          pitCount: u.pitCount ?? 0,
          inPit: u.inPit,
          retired: u.retired
        };
      }

      // Merge incremental updates without inventing numbers
      if (u.position !== undefined) entry.position = u.position;
      if (u.gap !== undefined) entry.gap = u.gap;
      if (u.interval !== undefined) entry.interval = u.interval;
      if (u.currentLap !== undefined) entry.currentLap = u.currentLap;
      if (u.lastLapTime !== undefined) entry.lastLapTime = u.lastLapTime;
      if (u.bestLapTime !== undefined) entry.bestLapTime = u.bestLapTime;
      if (u.isOverallFastestLap !== undefined) entry.isOverallFastestLap = u.isOverallFastestLap;
      if (u.sector1) entry.sectors[0] = { ...entry.sectors[0], ...u.sector1 };
      if (u.sector2) entry.sectors[1] = { ...entry.sectors[1], ...u.sector2 };
      if (u.sector3) entry.sectors[2] = { ...entry.sectors[2], ...u.sector3 };
      if (u.inPit !== undefined) entry.inPit = u.inPit;
      if (u.retired !== undefined) entry.retired = u.retired;
      if (u.pitCount !== undefined) entry.pitCount = u.pitCount;
      if (u.speedTrapKmH !== undefined) entry.speedTrapKmH = u.speedTrapKmH;

      entriesMap.set(u.driverNumber, entry);
    }

    // Sort entries by position
    const sorted = Array.from(entriesMap.values()).sort((a, b) => a.position - b.position);
    this.snapshot.entries = sorted;
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
