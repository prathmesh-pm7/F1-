import { DataProvenance, RaceControlMessage, SessionDetail } from '../../types/f1';

export type OpenF1Record = Record<string, unknown>;
const OPENF1_BASE = 'https://api.openf1.org/v1';

export function normalizeOpenF1Weather(rows: OpenF1Record[]): SessionDetail['weather'] {
  const row = rows.filter(item => item && typeof item === 'object')
    .sort((a, b) => new Date(String(a.date ?? '')).getTime() - new Date(String(b.date ?? '')).getTime())
    .at(-1);
  if (!row) return undefined;
  const numberOrUndefined = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : undefined; };
  const airTemp = numberOrUndefined(row.air_temperature), trackTemp = numberOrUndefined(row.track_temperature), humidity = numberOrUndefined(row.humidity), pressure = numberOrUndefined(row.pressure), windSpeed = numberOrUndefined(row.wind_speed), windDirection = numberOrUndefined(row.wind_direction);
  if ([airTemp, trackTemp, humidity, pressure, windSpeed, windDirection].some(value => value === undefined)) return undefined;
  const isRain = Boolean(row.rainfall);
  const rainProb = numberOrUndefined(row.rainfall_probability ?? row.rain_probability) ?? (isRain ? 100 : 0);
  return { airTemp: airTemp!, trackTemp: trackTemp!, humidity: humidity!, pressure: pressure!, windSpeed: windSpeed!, windDirection: windDirection!, rainfall: isRain, rainfallProbability: rainProb };
}

export function normalizeOpenF1RaceControl(rows: OpenF1Record[], sessionKey: number): SessionDetail['raceControl'] {
  if (!rows.length) return [];
  const provenanceBase: DataProvenance = { provider: 'OpenF1', sourceUrl: OPENF1_BASE + '/race_control?session_key=' + sessionKey, retrievedAt: new Date().toISOString(), isLive: false, isFixture: false, isHistorical: true, notes: 'Historical OpenF1 race-control messages' };
  return rows.map((row, index) => {
    const message = String(row.message ?? row.category ?? 'Race control update');
    const rawCategory = String(row.category ?? '').toUpperCase();
    const rawFlag = String(row.flag ?? '').toUpperCase();
    const category: RaceControlMessage['category'] = rawCategory.includes('FLAG') || rawFlag ? 'FLAG' : rawCategory.includes('SAFETY') || /safety car|virtual safety car/i.test(message) ? 'SAFETY_CAR' : rawCategory.includes('INVEST') ? 'INVESTIGATION' : rawCategory.includes('PENAL') ? 'PENALTY' : rawCategory.includes('TRACK') || /track limit/i.test(message) ? 'TRACK_LIMITS' : rawCategory.includes('DRS') ? 'DRS' : 'INFO';
    const flagMap: Record<string, RaceControlMessage['flag']> = { GREEN: 'GREEN', YELLOW: 'YELLOW', DOUBLE_YELLOW: 'DOUBLE_YELLOW', RED: 'RED', BLUE: 'BLUE', CHEQUERED: 'CHEQUERED', CLEAR: 'CLEAR' };
    return { id: String(row.id ?? 'openf1-' + sessionKey + '-rc-' + index), time: String(row.date ?? row.time ?? ''), lap: Number(row.lap_number) > 0 ? Number(row.lap_number) : undefined, category, flag: flagMap[rawFlag], driverNumber: Number(row.driver_number) > 0 ? Number(row.driver_number) : undefined, message, provenance: { ...provenanceBase } };
  });
}
