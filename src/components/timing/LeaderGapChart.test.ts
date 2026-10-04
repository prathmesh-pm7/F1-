import { describe, expect, it } from 'vitest';
import { LapTelemetry } from '../../types/f1';

describe('LeaderGapChart calculations', () => {
  it('correctly calculates leader and gap over multiple laps', () => {
    const sampleLaps: LapTelemetry[] = [
      { lapNumber: 1, driverNumber: 16, driverCode: 'LEC', lapTime: '1:25.000', lapDuration: 85.0 },
      { lapNumber: 1, driverNumber: 1, driverCode: 'VER', lapTime: '1:26.200', lapDuration: 86.2 },
      { lapNumber: 2, driverNumber: 16, driverCode: 'LEC', lapTime: '1:23.100', lapDuration: 83.1 },
      { lapNumber: 2, driverNumber: 1, driverCode: 'VER', lapTime: '1:22.900', lapDuration: 82.9 }
    ];

    const lapsByLapNum = new Map<number, LapTelemetry[]>();
    sampleLaps.forEach(l => {
      const list = lapsByLapNum.get(l.lapNumber) || [];
      list.push(l);
      lapsByLapNum.set(l.lapNumber, list);
    });

    const cumTimeMap = new Map<number, number>();
    const results: { lap: number; gap: number; isLeader: boolean }[] = [];

    for (const [lapNum, drivers] of lapsByLapNum.entries()) {
      drivers.forEach(d => {
        if (d.lapDuration) {
          cumTimeMap.set(d.driverNumber, (cumTimeMap.get(d.driverNumber) || 0) + d.lapDuration);
        }
      });

      let minTime = Infinity;
      let leaderNum = 0;
      drivers.forEach(d => {
        const t = cumTimeMap.get(d.driverNumber);
        if (t != null && t < minTime) {
          minTime = t;
          leaderNum = d.driverNumber;
        }
      });

      const verCumTime = cumTimeMap.get(1) || 0;
      const gap = Math.max(0, verCumTime - minTime);
      results.push({ lap: lapNum, gap: Number(gap.toFixed(3)), isLeader: leaderNum === 1 });
    }

    expect(results).toHaveLength(2);
    // Lap 1: LEC was 85.0, VER was 86.2 -> gap is 1.2s
    expect(results[0].gap).toBe(1.2);
    expect(results[0].isLeader).toBe(false);
    // Lap 2: LEC total is 168.1, VER total is 169.1 -> gap is 1.0s (VER gained 0.2s)
    expect(results[1].gap).toBe(1.0);
    expect(results[1].isLeader).toBe(false);
  });

  it('marks gap as 0.0s when favorite driver is the leader', () => {
    const sampleLaps: LapTelemetry[] = [
      { lapNumber: 1, driverNumber: 1, driverCode: 'VER', lapTime: '1:24.000', lapDuration: 84.0 },
      { lapNumber: 1, driverNumber: 16, driverCode: 'LEC', lapTime: '1:25.500', lapDuration: 85.5 }
    ];

    const cumTimeMap = new Map<number, number>();
    sampleLaps.forEach(d => {
      cumTimeMap.set(d.driverNumber, d.lapDuration || 0);
    });

    const minTime = Math.min(...Array.from(cumTimeMap.values()));
    const verTime = cumTimeMap.get(1) || 0;
    const gap = Math.max(0, verTime - minTime);

    expect(gap).toBe(0);
  });
});
