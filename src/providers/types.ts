import {
  DriverStanding,
  ConstructorStanding,
  GrandPrix,
  Driver,
  Team,
  Circuit,
  TimingEntry,
  RaceControlMessage,
  TrackStatus,
  Weather,
  LiveConnectionState,
  DataProvenance
} from '../types/f1';

export interface LiveSessionSnapshot {
  sessionName: string;
  circuitName: string;
  currentLap: number;
  totalLaps: number;
  remainingTimeStr?: string;
  trackStatus: TrackStatus;
  weather: Weather;
  entries: TimingEntry[];
  fastestLap?: {
    driverCode: string;
    time: string;
    lap: number;
  };
  raceControl: RaceControlMessage[];
  provenance: DataProvenance;
  connectionState: LiveConnectionState;
}

export interface F1DataProvider {
  name: string;
  getSchedule(year?: number): Promise<GrandPrix[]>;
  getDriverStandings(year?: number): Promise<DriverStanding[]>;
  getConstructorStandings(year?: number): Promise<ConstructorStanding[]>;
  getDrivers(year?: number): Promise<Driver[]>;
  getTeams(year?: number): Promise<Team[]>;
  getCircuits(): Promise<Circuit[]>;
}

export interface F1LiveProvider {
  name: string;
  connect(): Promise<void>;
  disconnect(): void;
  getState(): LiveConnectionState;
  onSnapshot(callback: (snapshot: LiveSessionSnapshot) => void): () => void;
  onStateChange(callback: (state: LiveConnectionState, reason?: string) => void): () => void;
  onRaceControlMessage(callback: (msg: RaceControlMessage) => void): () => void;
}
