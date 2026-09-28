import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeOpenF1RaceControl, normalizeOpenF1Weather } from './normalizers/openF1Normalizer';
import { JolpicaProvider } from './jolpicaProvider';
import { LiveSessionStateStore } from './f1live/normalizers/liveSessionStateStore';

const timing = JSON.parse(readFileSync(new URL('../data/replays/monza-2024/timing.json', import.meta.url), 'utf8')) as Record<string, any[]>;
const raceControl = JSON.parse(readFileSync(new URL('../data/replays/monza-2024/race-control.json', import.meta.url), 'utf8')) as any[];
const weather = JSON.parse(readFileSync(new URL('../data/replays/monza-2024/weather.json', import.meta.url), 'utf8')) as Record<string, number | boolean>;

const provenance = { provider: 'Jolpica F1' as const, retrievedAt: '2024-09-01T15:00:00Z', isLive: false, isFixture: true, isHistorical: true };

describe('data normalizers', () => {
  it('normalizes OpenF1 weather and race control without inventing empty records', () => {
    const normalizedWeather = normalizeOpenF1Weather([{ date: '2024-09-01T14:00:00Z', air_temperature: weather.airTemp, track_temperature: weather.trackTemp, humidity: weather.humidity, pressure: weather.pressure, wind_speed: weather.windSpeed, wind_direction: weather.windDirection, rainfall: weather.rainfall }]);
    expect(normalizedWeather).toEqual(weather);
    expect(normalizeOpenF1Weather([])).toBeUndefined();
    const normalizedControl = normalizeOpenF1RaceControl(raceControl.map(item => ({ id: item.id, date: '2024-09-01T14:00:00Z', lap_number: item.lap, category: item.category, flag: item.flag, message: item.message, driver_number: item.driverNumber })), 123);
    expect(normalizedControl).toHaveLength(raceControl.length);
    expect(normalizedControl?.[0]?.message).toBe(raceControl[0].message);
  });

  it('normalizes replay timing through the live session store', () => {
    const source = timing['36'][0];
    const store = new LiveSessionStateStore();
    store.mergeTimingData([{ driverNumber: source.driverNumber, position: source.position, gap: source.gap, interval: source.interval, currentLap: source.currentLap, lastLapTime: source.lastLapTime, bestLapTime: source.bestLapTime, pitCount: source.pitCount, speedTrapKmH: source.speedTrapKmH, inPit: source.inPit, retired: false, stopped: false, sector1: source.sectors[0], sector2: source.sectors[1], sector3: source.sectors[2] }]);
    store.mergeTimingAppData(new Map([[source.driverNumber, { compound: source.tyre.compound, age: source.tyre.age }]]));
    const entry = store.getSnapshot().entries[0];
    expect(entry.driverNumber).toBe(16);
    expect(entry.tyre).toEqual({ compound: 'HARD', age: 21 });
    expect(entry.sectors[1].timeStr).toBe('28.210');
  });

  it('normalizes a replay fixture through the Jolpica session-detail adapter', () => {
    const source = timing['36'][0];
    const provider = new JolpicaProvider();
    const detail = provider.toSessionDetail({
      season: 2024, round: 16, raceName: 'Italian Grand Prix', circuit: { id: 'monza', name: 'Autodromo Nazionale Monza', location: 'Monza', country: 'Italy' },
      raceResults: [{ position: 1, positionText: '1', driverId: 'leclerc', driverCode: source.driverCode, driverName: source.driverName, driverNumber: source.driverNumber, constructorId: 'ferrari', teamName: source.teamName, teamColor: source.teamColor, grid: 1, lapsCompleted: source.currentLap, status: 'Finished', points: 25, finishTime: '' }],
      qualifying: [], sprintResults: [], laps: [{ lap: source.currentLap, driverId: 'leclerc', driverCode: source.driverCode, driverName: source.driverName, position: source.position, time: source.lastLapTime }], pitStops: [], provenance
    } as any, { id: 'r16-race', name: 'Grand Prix Race', type: 'RACE', startTime: '2024-09-01T13:00:00Z', status: 'COMPLETED' } as any);
    expect(detail.results[0].driverCode).toBe('LEC');
    expect(detail.laps[0].lapNumber).toBe(36);
    expect(detail.circuitName).toContain('Monza');
  });
});
