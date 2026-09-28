import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTimingData, parseTimingAppData } from './timingDataParser';
import { parseTrackStatus } from './trackStatusParser';
import { parseRaceControlMessages } from './raceControlParser';

type Fixture = Record<string, Array<any>>;
const fixture = JSON.parse(readFileSync(new URL('../../../data/replays/monza-2024/timing.json', import.meta.url), 'utf8')) as Fixture;

describe('timing parsers', () => {
  it('parses a replay timing record into the SignalR TimingData shape', () => {
    const source = fixture['36'][0];
    const raw = { Lines: { [source.driverNumber]: {
      Position: String(source.position), GapToLeader: source.gap === 'LEADER' ? '' : source.gap,
      IntervalToPositionAhead: { Value: source.interval }, NumberOfLaps: source.currentLap,
      LastLapTime: { Value: source.lastLapTime }, BestLapTime: { Value: source.bestLapTime },
      Sectors: source.sectors.map((sector: any) => ({ Value: sector.timeStr, OverallFastest: sector.status === 'overall-best', PersonalFastest: sector.status === 'personal-best' })),
      Speeds: { ST: { Value: String(source.speedTrapKmH) } }, InPit: source.inPit, PitOut: false,
      Retired: false, Stopped: false, NumberOfPitStops: source.pitCount
    } } };
    const [parsed] = parseTimingData(raw);
    expect(parsed.driverNumber).toBe(16);
    expect(parsed.position).toBe(1);
    expect(parsed.gap).toBe('LEADER');
    expect(parsed.lastLapTime).toBe('1:23.412');
    expect(parsed.speedTrapKmH).toBe(348.6);
    expect(parsed.sector2?.timeStr).toBe('28.210');
  });

  it('parses track status codes into explicit flags', () => {
    expect(parseTrackStatus({ Status: '5' })?.flag).toBe('RED');
    expect(parseTrackStatus({ Status: '6' })?.virtualSafetyCar).toBe(true);
  });

  it('parses race-control categories and flags from a fixture event', () => {
    const source = JSON.parse(readFileSync(new URL('../../../data/replays/monza-2024/race-control.json', import.meta.url), 'utf8'))[1];
    const [message] = parseRaceControlMessages([{ Id: source.id, Utc: '2024-09-01T14:08:40Z', Lap: String(source.lap), Category: source.category, Flag: source.flag, Message: source.message, DriverNumber: String(source.driverNumber ?? '') }]);
    expect(message.category).toBe('FLAG');
    expect(message.flag).toBe('YELLOW');
    expect(message.lap).toBe(9);
  });

  it('parses tyre/stint data without inventing a compound', () => {
    const source = fixture['36'][0];
    const raw = { Lines: { [source.driverNumber]: { Stints: source.stints.map((stint: any) => ({ Compound: stint.compound, TotalLaps: stint.lapsUsed })) } } };
    const parsed = parseTimingAppData(raw).get(16);
    expect(parsed).toEqual({ compound: 'HARD', age: 21 });
  });
});
