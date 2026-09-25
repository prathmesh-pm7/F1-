import { SectorTime, TyreCompound } from '../../../types/f1';

export interface RawDriverTimingUpdate {
  driverNumber: number;
  position?: number;
  gap?: string;
  interval?: string;
  currentLap?: number;
  lastLapTime?: string;
  bestLapTime?: string;
  isOverallFastestLap?: boolean;
  sector1?: Partial<SectorTime>;
  sector2?: Partial<SectorTime>;
  sector3?: Partial<SectorTime>;
  currentSector?: 1 | 2 | 3;
  inPit?: boolean;
  pitOut?: boolean;
  retired?: boolean;
  stopped?: boolean;
  pitCount?: number;
  speedTrapKmH?: number;
  tyreCompound?: TyreCompound;
  tyreAge?: number;
}

/**
 * Parses raw TimingData updates.
 * In F1 SignalR, TimingData is keyed by car number:
 * {
 *   Lines: {
 *     "1": {
 *       Position: "1",
 *       GapToLeader: "",
 *       IntervalToPositionAhead: { Value: "" },
 *       NumberOfLaps: 38,
 *       LastLapTime: { Value: "1:23.218", OverallFastest: false, PersonalFastest: true },
 *       BestLapTime: { Value: "1:22.941" },
 *       Sectors: [
 *         { Value: "27.482", OverallFastest: false, PersonalFastest: false },
 *         { Value: "28.140" },
 *         { Value: "27.596" }
 *       ],
 *       Speeds: { ST: { Value: "348.6" } },
 *       InPit: false,
 *       PitOut: false,
 *       Retired: false,
 *       Stopped: false,
 *       NumberOfPitStops: 1
 *     }
 *   }
 * }
 */
export function parseTimingData(raw: any): RawDriverTimingUpdate[] {
  if (!raw || typeof raw !== 'object') return [];

  const lines = raw.Lines || raw.lines || raw;
  if (!lines || typeof lines !== 'object') return [];

  const updates: RawDriverTimingUpdate[] = [];

  for (const [key, lineVal] of Object.entries(lines)) {
    if (!lineVal || typeof lineVal !== 'object') continue;
    const l = lineVal as any;
    const driverNumber = parseInt(key, 10);
    if (isNaN(driverNumber)) continue;

    const position = l.Position ? parseInt(String(l.Position), 10) : undefined;
    const currentLap = l.NumberOfLaps !== undefined ? parseInt(String(l.NumberOfLaps), 10) : undefined;

    let gap: string | undefined = undefined;
    if (l.GapToLeader !== undefined) {
      gap = typeof l.GapToLeader === 'object' ? l.GapToLeader?.Value : String(l.GapToLeader);
      if (gap === '') gap = 'LEADER';
    }

    let interval: string | undefined = undefined;
    if (l.IntervalToPositionAhead !== undefined) {
      interval = typeof l.IntervalToPositionAhead === 'object' ? l.IntervalToPositionAhead?.Value : String(l.IntervalToPositionAhead);
      if (interval === '') interval = '—';
    }

    let lastLapTime: string | undefined = undefined;
    if (l.LastLapTime !== undefined) {
      lastLapTime = typeof l.LastLapTime === 'object' ? l.LastLapTime?.Value : String(l.LastLapTime);
    }

    let bestLapTime: string | undefined = undefined;
    if (l.BestLapTime !== undefined) {
      bestLapTime = typeof l.BestLapTime === 'object' ? l.BestLapTime?.Value : String(l.BestLapTime);
    }

    const isOverallFastestLap = Boolean(
      l.LastLapTime?.OverallFastest ||
      l.BestLapTime?.OverallFastest
    );

    // Sectors
    let s1: Partial<SectorTime> | undefined = undefined;
    let s2: Partial<SectorTime> | undefined = undefined;
    let s3: Partial<SectorTime> | undefined = undefined;

    if (Array.isArray(l.Sectors) || (l.Sectors && typeof l.Sectors === 'object')) {
      const sArr = Array.isArray(l.Sectors) ? l.Sectors : Object.values(l.Sectors);
      if (sArr[0]) {
        s1 = {
          sector: 1,
          timeStr: sArr[0]?.Value || '—',
          status: sArr[0]?.OverallFastest ? 'overall-best' : sArr[0]?.PersonalFastest ? 'personal-best' : 'normal'
        };
      }
      if (sArr[1]) {
        s2 = {
          sector: 2,
          timeStr: sArr[1]?.Value || '—',
          status: sArr[1]?.OverallFastest ? 'overall-best' : sArr[1]?.PersonalFastest ? 'personal-best' : 'normal'
        };
      }
      if (sArr[2]) {
        s3 = {
          sector: 3,
          timeStr: sArr[2]?.Value || '—',
          status: sArr[2]?.OverallFastest ? 'overall-best' : sArr[2]?.PersonalFastest ? 'personal-best' : 'normal'
        };
      }
    }

    // Speed Trap
    let speedTrapKmH: number | undefined = undefined;
    if (l.Speeds?.ST?.Value) {
      const parsedSpeed = parseFloat(l.Speeds.ST.Value);
      if (!isNaN(parsedSpeed)) speedTrapKmH = parsedSpeed;
    }

    // Pit count
    const pitCount = l.NumberOfPitStops !== undefined ? parseInt(String(l.NumberOfPitStops), 10) : undefined;

    updates.push({
      driverNumber,
      position: isNaN(position!) ? undefined : position,
      gap,
      interval,
      currentLap: isNaN(currentLap!) ? undefined : currentLap,
      lastLapTime,
      bestLapTime,
      isOverallFastestLap,
      sector1: s1,
      sector2: s2,
      sector3: s3,
      inPit: l.InPit === true || l.InPit === 'true',
      pitOut: l.PitOut === true || l.PitOut === 'true',
      retired: l.Retired === true || l.Retired === 'true',
      stopped: l.Stopped === true || l.Stopped === 'true',
      pitCount: isNaN(pitCount!) ? undefined : pitCount,
      speedTrapKmH
    });
  }

  return updates;
}

/**
 * Parses TimingAppData stream which carries tyre compound and stint details.
 * { Lines: { "1": { Stints: [ { Compound: "HARD", TotalLaps: 23 } ] } } }
 */
export function parseTimingAppData(raw: any): Map<number, { compound: TyreCompound; age: number }> {
  const map = new Map<number, { compound: TyreCompound; age: number }>();
  if (!raw || typeof raw !== 'object') return map;

  const lines = raw.Lines || raw.lines || raw;
  if (!lines || typeof lines !== 'object') return map;

  for (const [key, lineVal] of Object.entries(lines)) {
    if (!lineVal || typeof lineVal !== 'object') continue;
    const l = lineVal as any;
    const num = parseInt(key, 10);
    if (isNaN(num)) continue;

    const stints = l.Stints ? (Array.isArray(l.Stints) ? l.Stints : Object.values(l.Stints)) : [];
    if (stints.length > 0) {
      const latestStint: any = stints[stints.length - 1];
      let compound: TyreCompound = 'UNKNOWN';
      const c = (latestStint?.Compound || '').toUpperCase();
      if (c.includes('SOFT')) compound = 'SOFT';
      else if (c.includes('MED')) compound = 'MEDIUM';
      else if (c.includes('HARD')) compound = 'HARD';
      else if (c.includes('INTER')) compound = 'INTERMEDIATE';
      else if (c.includes('WET')) compound = 'WET';

      const age = parseInt(latestStint?.TotalLaps ?? 0, 10);

      map.set(num, {
        compound,
        age: isNaN(age) ? 0 : age
      });
    }
  }

  return map;
}
