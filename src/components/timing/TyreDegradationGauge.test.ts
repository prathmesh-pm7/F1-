import { describe, expect, it } from 'vitest';
import { calculateTyreWear } from './TyreDegradationGauge';
import { TimingEntry, LapTelemetry } from '../../types/f1';

const mockEntry = (overrides: Partial<TimingEntry> = {}): TimingEntry => ({
  position: 1,
  driverNumber: 16,
  driverCode: 'LEC',
  driverName: 'Charles Leclerc',
  teamName: 'Ferrari',
  teamColor: '#E8002D',
  gap: 'LEADER',
  interval: '—',
  currentLap: 38,
  lastLapTime: '1:21.432',
  bestLapTime: '1:21.432',
  sectors: [
    { sector: 1, timeStr: '26.890', status: 'normal' },
    { sector: 2, timeStr: '27.450', status: 'normal' },
    { sector: 3, timeStr: '27.092', status: 'normal' }
  ],
  currentSector: 3,
  tyre: {
    compound: 'HARD',
    age: 21
  },
  stints: [
    { stintNumber: 1, compound: 'MEDIUM', startLap: 1, endLap: 17, lapsUsed: 17 },
    { stintNumber: 2, compound: 'HARD', startLap: 18, lapsUsed: 21 }
  ],
  pitCount: 1,
  ...overrides
});

describe('calculateTyreWear', () => {
  it('calculates 100% life remaining on brand new tyres (0 laps)', () => {
    const entry = mockEntry({
      tyre: { compound: 'SOFT', age: 0 }
    });
    const result = calculateTyreWear(entry, [], 35);
    expect(result.percentageRemaining).toBe(100);
    expect(result.status).toBe('OPTIMAL');
    expect(result.lapsRemaining).toBeGreaterThan(15);
  });

  it('calculates degradation accurately on Hard compound with 21 laps', () => {
    const entry = mockEntry({
      tyre: { compound: 'HARD', age: 21 }
    });
    const result = calculateTyreWear(entry, [], 35);
    // On Hard tyres (~46 laps max), at 21 laps, remaining should be around 45-60%
    expect(result.percentageRemaining).toBeGreaterThan(40);
    expect(result.percentageRemaining).toBeLessThan(70);
    expect(result.lapsRemaining).toBeGreaterThan(15);
    expect(result.status).toBe('MODERATE');
  });

  it('flags CRITICAL status and near 0% life when past tyre cliff threshold', () => {
    const entry = mockEntry({
      tyre: { compound: 'SOFT', age: 24 } // Soft max is ~20 laps
    });
    const result = calculateTyreWear(entry, [], 35);
    expect(result.percentageRemaining).toBeLessThan(15);
    expect(result.status).toBe('CRITICAL');
    expect(result.lapsRemaining).toBe(0);
  });

  it('adjusts thermal degradation when track temperature is elevated', () => {
    const entry = mockEntry({
      tyre: { compound: 'MEDIUM', age: 15 }
    });
    const normalTrack = calculateTyreWear(entry, [], 30);
    const hotTrack = calculateTyreWear(entry, [], 55); // 55°C track
    expect(hotTrack.thermalFactor).toBeGreaterThan(normalTrack.thermalFactor);
    expect(hotTrack.percentageRemaining).toBeLessThanOrEqual(normalTrack.percentageRemaining);
  });

  it('incorporates historical lap telemetry degradation trend', () => {
    const entry = mockEntry({
      driverNumber: 16,
      tyre: { compound: 'MEDIUM', age: 10 }
    });
    const telemetryLaps: LapTelemetry[] = [
      { lapNumber: 29, driverNumber: 16, driverCode: 'LEC', lapTime: '1:22.100', lapDuration: 82.1 },
      { lapNumber: 30, driverNumber: 16, driverCode: 'LEC', lapTime: '1:22.250', lapDuration: 82.25 },
      { lapNumber: 31, driverNumber: 16, driverCode: 'LEC', lapTime: '1:22.400', lapDuration: 82.4 },
      { lapNumber: 32, driverNumber: 16, driverCode: 'LEC', lapTime: '1:22.600', lapDuration: 82.6 }
    ];
    const result = calculateTyreWear(entry, telemetryLaps, 35);
    expect(result.telemetryTrendText).toContain('Telemetry pace wear');
    expect(result.degRateSecondsPerLap).toBeGreaterThan(0.02);
  });
});
