/**
 * F1 Pulse Domain Models
 * Strict TypeScript types for Formula 1 timing, telemetry, race control, and season intelligence.
 */

export type LiveConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SUBSCRIBED'
  | 'LIVE'
  | 'STALE'
  | 'PROVIDER_UNAVAILABLE'
  | 'ERROR'
  | 'REPLAY'
  | 'FIXTURE';

export interface DataProvenance {
  provider: 'Jolpica F1' | 'OpenF1' | 'F1 Live Timing (SignalR)' | 'Replay Engine' | 'FIA Official' | 'Curated Technical' | 'Provider Unavailable';
  sourceUrl?: string;
  retrievedAt: string;
  lastUpdatedAt?: string;
  isLive: boolean;
  isFixture: boolean;
  isHistorical?: boolean;
  notes?: string;
}

export type FlagColor = 'GREEN' | 'YELLOW' | 'DOUBLE_YELLOW' | 'RED' | 'BLUE' | 'CHEQUERED' | 'CLEAR';

export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'SPRINT_SHOOTOUT' | 'SPRINT' | 'RACE';

export interface TrackStatus {
  status: '1' | '2' | '4' | '5' | '6' | '7'; // F1 track status codes: 1=All Clear, 2=Yellow, 4=SC, 5=Red, 6=VSC, 7=VSC Ending
  message: string;
  flag: FlagColor;
  safetyCarDeployed: boolean;
  virtualSafetyCar: boolean;
  redFlag: boolean;
  updatedAt: string;
}

export interface Weather {
  airTemp: number; // Celsius
  trackTemp: number; // Celsius
  humidity: number; // %
  pressure: number; // mbar
  windSpeed: number; // m/s or km/h
  windDirection: number; // degrees
  rainfall: boolean;
}

export interface SectorTime {
  sector: 1 | 2 | 3;
  timeStr: string;
  seconds?: number;
  status: 'personal-best' | 'overall-best' | 'normal' | 'pit' | 'unknown';
}

export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';

export interface TyreStint {
  stintNumber: number;
  compound: TyreCompound;
  lapsUsed: number;
  startLap: number;
  endLap?: number;
  isNew?: boolean;
}

export interface PitStop {
  stopNumber: number;
  lap: number;
  pitDurationStr: string; // e.g., "2.3s"
  pitLaneDurationStr: string; // e.g., "21.450s"
  durationSeconds: number;
  timestamp: string;
}

export interface TimingEntry {
  position: number;
  driverNumber: number;
  driverCode: string; // e.g., "VER", "NOR", "LEC"
  driverName: string;
  teamName: string;
  teamColor: string; // Hex color
  gap: string; // e.g. "LEADER", "+1.428", "1 LAP"
  interval: string; // e.g. "—", "+0.312"
  gapToLeaderSeconds: number;
  intervalSeconds: number;
  currentLap: number;
  lastLapTime: string;
  bestLapTime: string;
  isOverallFastestLap?: boolean;
  sectors: [SectorTime, SectorTime, SectorTime];
  currentSector: 1 | 2 | 3;
  tyre: {
    compound: TyreCompound;
    age: number; // laps on current tyre
  };
  stints: TyreStint[];
  pitCount: number;
  lastPitLap?: number;
  inPit?: boolean;
  pitOut?: boolean;
  retired?: boolean;
  stopped?: boolean;
  retirementReason?: string;
  speedTrapKmH?: number;
  drsEligible?: boolean;
}

export interface RaceControlMessage {
  id: string;
  time: string; // HH:MM:SS or Lap X
  lap?: number;
  category: 'FLAG' | 'SAFETY_CAR' | 'INVESTIGATION' | 'PENALTY' | 'TRACK_LIMITS' | 'DRS' | 'INFO';
  flag?: FlagColor;
  driverNumber?: number;
  message: string;
  provenance: DataProvenance;
}

export interface Driver {
  id: string;
  code: string;
  number: number;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  dateOfBirth?: string;
  championshipPosition?: number;
  points?: number;
  wins?: number;
  podiums?: number;
  careerPoles?: number;
  careerStarts?: number;
  permanentNumber?: number;
}

export interface Team {
  id: string;
  name: string;
  fullName: string;
  base: string;
  teamPrincipal?: string;
  powerUnit: string;
  color: string;
  secondaryColor?: string;
  drivers: [string, string]; // Driver codes e.g. ['VER', 'PER']
  position?: number;
  points?: number;
  wins?: number;
  podiums?: number;
}

export interface DriverStanding {
  position: number;
  driver: Driver;
  points: number;
  wins: number;
  behindLeader: number;
}

export interface ConstructorStanding {
  position: number;
  team: Team;
  points: number;
  wins: number;
  behindLeader: number;
}

export interface Circuit {
  id: string;
  name: string;
  location: string;
  country: string;
  lengthKm?: number;
  turns?: number;
  drsZones?: number;
  lapRecord?: {
    time: string;
    driver: string;
    year: number;
  };
}

export interface SessionSchedule {
  id: string;
  name: string;
  type: SessionType;
  startTime: string; // ISO 8601
  status: 'SCHEDULED' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'DELAYED';
}

export interface GrandPrix {
  round: number;
  season: number;
  id: string;
  name: string;
  officialName: string;
  circuit: Circuit;
  country: string;
  countryCode: string;
  date: string;
  sessions: SessionSchedule[];
  totalLaps: number;
  isSprintWeekend: boolean;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  winner?: {
    driver: string;
    team: string;
    time: string;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: 'FIA' | 'TECHNICAL' | 'RACE_CONTROL' | 'PADDOCK' | 'REGULATIONS';
  verified: boolean;
  provenance: DataProvenance;
}

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
  lastUpdated: string; // ISO 8601 timestamp
}

export interface TechnicalUpdate {
  id: string;
  team: string;
  teamColor: string;
  component: 'Front Wing' | 'Floor & Venturi' | 'Sidepods' | 'Rear Wing / Beam' | 'Brake Ducts' | 'Suspension' | 'Power Unit' | 'Chassis & Weight';
  updateType: 'Aerodynamic' | 'Cooling' | 'Structural' | 'Reliability' | 'Weight Saving';
  weekend: string;
  submissionDate: string;
  summary: string;
  technicalDescription: string;
  source: string;
  sourceUrl?: string;
  status: 'VERIFIED' | 'REPORTED';
  sourceDocNumber?: string;
  provenance: DataProvenance;
}

export interface FIADocument {
  id: string;
  docNumber: number;
  title: string;
  date: string;
  time: string;
  event: string;
  session?: string;
  type: 'Race Director Notes' | 'Stewards Decision' | 'Technical Delegate Report' | 'Summons' | 'Infringement' | 'Grid / Entry List';
  documentUrl: string;
  verified: boolean;
  provenance: DataProvenance;
}
