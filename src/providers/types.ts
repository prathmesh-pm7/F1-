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

export type ProviderResult<T> =
  | { status: 'SUCCESS'; data: T; provenance: DataProvenance }
  | { status: 'EMPTY'; data: T; message: string; provenance: DataProvenance }
  | { status: 'ERROR'; error: string; provenance: DataProvenance };

export type ProviderCapability =
  | 'calendar'
  | 'standings'
  | 'results'
  | 'qualifying'
  | 'sprint'
  | 'circuits'
  | 'drivers'
  | 'teams'
  | 'liveTiming';

export interface F1DataProvider {
  name: string;
  capabilities: ProviderCapability[];
  getSchedule(year?: number): Promise<ProviderResult<GrandPrix[]>>;
  getDriverStandings(year?: number): Promise<ProviderResult<DriverStanding[]>>;
  getConstructorStandings(year?: number): Promise<ProviderResult<ConstructorStanding[]>>;
  getDrivers(year?: number): Promise<ProviderResult<Driver[]>>;
  getTeams(year?: number): Promise<ProviderResult<Team[]>>;
  getCircuits(year?: number): Promise<ProviderResult<Circuit[]>>;
}

export interface F1LiveProvider {
  name: string;
  connect(): Promise<void>;
  disconnect(): void;
  getState(): LiveConnectionState;
  getLastUpdated(): string | null;
  onSnapshot(callback: (snapshot: import('../types/f1').LiveSessionSnapshot) => void): () => void;
  onStateChange(callback: (state: LiveConnectionState, reason?: string) => void): () => void;
  onRaceControlMessage(callback: (msg: RaceControlMessage) => void): () => void;
}
