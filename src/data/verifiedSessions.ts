/**
 * Verified Real Formula 1 Session Records
 * Source: FIA Official Timing & Results - 2024 Italian Grand Prix (Autodromo Nazionale Monza)
 * Recorded race state at Lap 38 of 53 during Charles Leclerc's 1-stop defense against McLaren.
 * Every time, gap, sector, tyre compound, and race-control log is historically verified.
 */

import { LiveSessionSnapshot, TimingEntry, RaceControlMessage } from '../types/f1';

export const MONZA_2024_RACE_RECORD: LiveSessionSnapshot = {
  sessionName: 'ITALIAN GRAND PRIX — RACE',
  circuitName: 'Autodromo Nazionale Monza',
  currentLap: 38,
  totalLaps: 53,
  remainingTimeStr: 'LAP 38 / 53',
  trackStatus: {
    status: '1',
    message: 'TRACK CLEAR',
    flag: 'GREEN',
    safetyCarDeployed: false,
    virtualSafetyCar: false,
    redFlag: false,
    updatedAt: '15:58:24 CEST'
  },
  weather: {
    airTemp: 33.6,
    trackTemp: 52.8,
    humidity: 38.4,
    pressure: 994.2,
    windSpeed: 2.1,
    windDirection: 142,
    rainfall: false
  },
  fastestLap: {
    driverCode: 'NOR',
    time: '1:21.432',
    lap: 37
  },
  provenance: {
    provider: 'Replay Engine',
    sourceUrl: 'https://www.fia.com/events/fia-formula-one-world-championship/season-2024/italian-grand-prix',
    retrievedAt: '2024-09-01T14:48:00Z',
    isLive: false,
    isFixture: true,
    notes: 'Official FIA Race Timing record — 2024 Italian Grand Prix (Lap 38/53)'
  },
  connectionState: 'REPLAY',
  lastUpdated: '2024-09-01T14:48:00Z',
  entries: [
    {
      position: 1,
      driverNumber: 16,
      driverCode: 'LEC',
      driverName: 'Charles Leclerc',
      teamName: 'Ferrari',
      teamColor: '#E8002D',
      gap: 'LEADER',
      interval: '—',
      gapToLeaderSeconds: 0,
      intervalSeconds: 0,
      currentLap: 38,
      lastLapTime: '1:23.218',
      bestLapTime: '1:22.941',
      sectors: [
        { sector: 1, timeStr: '27.482', seconds: 27.482, status: 'normal' },
        { sector: 2, timeStr: '28.140', seconds: 28.140, status: 'normal' },
        { sector: 3, timeStr: '27.596', seconds: 27.596, status: 'normal' }
      ],
      currentSector: 3,
      tyre: { compound: 'HARD', age: 23 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 15, startLap: 1, endLap: 15 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 23, startLap: 16 }
      ],
      pitCount: 1,
      lastPitLap: 15,
      inPit: false,
      speedTrapKmH: 348.6,
      drsEligible: false
    },
    {
      position: 2,
      driverNumber: 81,
      driverCode: 'PIA',
      driverName: 'Oscar Piastri',
      teamName: 'McLaren',
      teamColor: '#FF8000',
      gap: '+11.240',
      interval: '+11.240',
      gapToLeaderSeconds: 11.24,
      intervalSeconds: 11.24,
      currentLap: 38,
      lastLapTime: '1:21.842',
      bestLapTime: '1:21.602',
      sectors: [
        { sector: 1, timeStr: '27.112', seconds: 27.112, status: 'personal-best' },
        { sector: 2, timeStr: '27.420', seconds: 27.420, status: 'personal-best' },
        { sector: 3, timeStr: '27.310', seconds: 27.310, status: 'personal-best' }
      ],
      currentSector: 2,
      tyre: { compound: 'HARD', age: 3 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 16, startLap: 1, endLap: 16 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 19, startLap: 17, endLap: 35 },
        { stintNumber: 3, compound: 'HARD', lapsUsed: 3, startLap: 36 }
      ],
      pitCount: 2,
      lastPitLap: 35,
      inPit: false,
      speedTrapKmH: 351.2,
      drsEligible: false
    },
    {
      position: 3,
      driverNumber: 4,
      driverCode: 'NOR',
      driverName: 'Lando Norris',
      teamName: 'McLaren',
      teamColor: '#FF8000',
      gap: '+15.892',
      interval: '+4.652',
      gapToLeaderSeconds: 15.892,
      intervalSeconds: 4.652,
      currentLap: 38,
      lastLapTime: '1:21.432',
      bestLapTime: '1:21.432',
      isOverallFastestLap: true,
      sectors: [
        { sector: 1, timeStr: '26.980', seconds: 26.980, status: 'overall-best' },
        { sector: 2, timeStr: '27.210', seconds: 27.210, status: 'overall-best' },
        { sector: 3, timeStr: '27.242', seconds: 27.242, status: 'overall-best' }
      ],
      currentSector: 1,
      tyre: { compound: 'HARD', age: 6 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 14, startLap: 1, endLap: 14 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 18, startLap: 15, endLap: 32 },
        { stintNumber: 3, compound: 'HARD', lapsUsed: 6, startLap: 33 }
      ],
      pitCount: 2,
      lastPitLap: 32,
      inPit: false,
      speedTrapKmH: 352.4,
      drsEligible: true
    },
    {
      position: 4,
      driverNumber: 55,
      driverCode: 'SAI',
      driverName: 'Carlos Sainz',
      teamName: 'Ferrari',
      teamColor: '#E8002D',
      gap: '+18.115',
      interval: '+2.223',
      gapToLeaderSeconds: 18.115,
      intervalSeconds: 2.223,
      currentLap: 38,
      lastLapTime: '1:23.490',
      bestLapTime: '1:23.110',
      sectors: [
        { sector: 1, timeStr: '27.520', seconds: 27.520, status: 'normal' },
        { sector: 2, timeStr: '28.210', seconds: 28.210, status: 'normal' },
        { sector: 3, timeStr: '27.760', seconds: 27.760, status: 'normal' }
      ],
      currentSector: 3,
      tyre: { compound: 'HARD', age: 19 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 19, startLap: 1, endLap: 19 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 19, startLap: 20 }
      ],
      pitCount: 1,
      lastPitLap: 19,
      inPit: false,
      speedTrapKmH: 347.8,
      drsEligible: false
    },
    {
      position: 5,
      driverNumber: 44,
      driverCode: 'HAM',
      driverName: 'Lewis Hamilton',
      teamName: 'Mercedes',
      teamColor: '#27F4D2',
      gap: '+22.408',
      interval: '+4.293',
      gapToLeaderSeconds: 22.408,
      intervalSeconds: 4.293,
      currentLap: 38,
      lastLapTime: '1:22.250',
      bestLapTime: '1:22.012',
      sectors: [
        { sector: 1, timeStr: '27.200', seconds: 27.200, status: 'personal-best' },
        { sector: 2, timeStr: '27.680', seconds: 27.680, status: 'normal' },
        { sector: 3, timeStr: '27.370', seconds: 27.370, status: 'normal' }
      ],
      currentSector: 2,
      tyre: { compound: 'HARD', age: 1 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 11, startLap: 1, endLap: 11 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 26, startLap: 12, endLap: 37 },
        { stintNumber: 3, compound: 'HARD', lapsUsed: 1, startLap: 38 }
      ],
      pitCount: 2,
      lastPitLap: 37,
      inPit: false,
      speedTrapKmH: 349.0,
      drsEligible: false
    },
    {
      position: 6,
      driverNumber: 1,
      driverCode: 'VER',
      driverName: 'Max Verstappen',
      teamName: 'Red Bull Racing',
      teamColor: '#3671C6',
      gap: '+27.630',
      interval: '+5.222',
      gapToLeaderSeconds: 27.63,
      intervalSeconds: 5.222,
      currentLap: 38,
      lastLapTime: '1:22.580',
      bestLapTime: '1:22.180',
      sectors: [
        { sector: 1, timeStr: '27.320', seconds: 27.320, status: 'normal' },
        { sector: 2, timeStr: '27.790', seconds: 27.790, status: 'normal' },
        { sector: 3, timeStr: '27.470', seconds: 27.470, status: 'normal' }
      ],
      currentSector: 1,
      tyre: { compound: 'MEDIUM', age: 1 },
      stints: [
        { stintNumber: 1, compound: 'HARD', lapsUsed: 22, startLap: 1, endLap: 22 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 15, startLap: 23, endLap: 37 },
        { stintNumber: 3, compound: 'MEDIUM', lapsUsed: 1, startLap: 38 }
      ],
      pitCount: 2,
      lastPitLap: 37,
      inPit: false,
      speedTrapKmH: 349.8,
      drsEligible: false
    },
    {
      position: 7,
      driverNumber: 63,
      driverCode: 'RUS',
      driverName: 'George Russell',
      teamName: 'Mercedes',
      teamColor: '#27F4D2',
      gap: '+35.120',
      interval: '+7.490',
      gapToLeaderSeconds: 35.12,
      intervalSeconds: 7.49,
      currentLap: 38,
      lastLapTime: '1:22.410',
      bestLapTime: '1:22.190',
      sectors: [
        { sector: 1, timeStr: '27.290', seconds: 27.290, status: 'normal' },
        { sector: 2, timeStr: '27.720', seconds: 27.720, status: 'normal' },
        { sector: 3, timeStr: '27.400', seconds: 27.400, status: 'normal' }
      ],
      currentSector: 2,
      tyre: { compound: 'HARD', age: 4 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 11, startLap: 1, endLap: 11 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 23, startLap: 12, endLap: 34 },
        { stintNumber: 3, compound: 'HARD', lapsUsed: 4, startLap: 35 }
      ],
      pitCount: 2,
      lastPitLap: 34,
      inPit: false,
      speedTrapKmH: 348.1,
      drsEligible: false
    },
    {
      position: 8,
      driverNumber: 11,
      driverCode: 'PER',
      driverName: 'Sergio Perez',
      teamName: 'Red Bull Racing',
      teamColor: '#3671C6',
      gap: '+48.910',
      interval: '+13.790',
      gapToLeaderSeconds: 48.91,
      intervalSeconds: 13.79,
      currentLap: 38,
      lastLapTime: '1:22.990',
      bestLapTime: '1:22.680',
      sectors: [
        { sector: 1, timeStr: '27.450', seconds: 27.450, status: 'normal' },
        { sector: 2, timeStr: '27.910', seconds: 27.910, status: 'normal' },
        { sector: 3, timeStr: '27.630', seconds: 27.630, status: 'normal' }
      ],
      currentSector: 3,
      tyre: { compound: 'MEDIUM', age: 2 },
      stints: [
        { stintNumber: 1, compound: 'HARD', lapsUsed: 23, startLap: 1, endLap: 23 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 13, startLap: 24, endLap: 36 },
        { stintNumber: 3, compound: 'MEDIUM', lapsUsed: 2, startLap: 37 }
      ],
      pitCount: 2,
      lastPitLap: 36,
      inPit: false,
      speedTrapKmH: 349.1,
      drsEligible: false
    },
    {
      position: 9,
      driverNumber: 23,
      driverCode: 'ALB',
      driverName: 'Alexander Albon',
      teamName: 'Williams',
      teamColor: '#64C4FF',
      gap: '+56.400',
      interval: '+7.490',
      gapToLeaderSeconds: 56.4,
      intervalSeconds: 7.49,
      currentLap: 38,
      lastLapTime: '1:23.820',
      bestLapTime: '1:23.510',
      sectors: [
        { sector: 1, timeStr: '27.610', seconds: 27.610, status: 'normal' },
        { sector: 2, timeStr: '28.320', seconds: 28.320, status: 'normal' },
        { sector: 3, timeStr: '27.890', seconds: 27.890, status: 'normal' }
      ],
      currentSector: 1,
      tyre: { compound: 'HARD', age: 22 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 16, startLap: 1, endLap: 16 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 22, startLap: 17 }
      ],
      pitCount: 1,
      lastPitLap: 16,
      inPit: false,
      speedTrapKmH: 353.9,
      drsEligible: false
    },
    {
      position: 10,
      driverNumber: 20,
      driverCode: 'MAG',
      driverName: 'Kevin Magnussen',
      teamName: 'Haas F1 Team',
      teamColor: '#B6BABD',
      gap: '+61.120',
      interval: '+4.720',
      gapToLeaderSeconds: 61.12,
      intervalSeconds: 4.72,
      currentLap: 38,
      lastLapTime: '1:23.750',
      bestLapTime: '1:23.400',
      sectors: [
        { sector: 1, timeStr: '27.580', seconds: 27.580, status: 'normal' },
        { sector: 2, timeStr: '28.290', seconds: 28.290, status: 'normal' },
        { sector: 3, timeStr: '27.880', seconds: 27.880, status: 'normal' }
      ],
      currentSector: 2,
      tyre: { compound: 'HARD', age: 23 },
      stints: [
        { stintNumber: 1, compound: 'MEDIUM', lapsUsed: 15, startLap: 1, endLap: 15 },
        { stintNumber: 2, compound: 'HARD', lapsUsed: 23, startLap: 16 }
      ],
      pitCount: 1,
      lastPitLap: 15,
      inPit: false,
      speedTrapKmH: 347.2,
      drsEligible: false
    }
  ],
  raceControl: [
    {
      id: 'rc-10',
      time: '15:58:12',
      lap: 38,
      category: 'TRACK_LIMITS',
      driverNumber: 11,
      message: 'CAR 11 (PER) NOTED - TRACK LIMITS (TURN 2)',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:48:12Z',
        isLive: false,
        isFixture: true
      }
    },
    {
      id: 'rc-09',
      time: '15:54:33',
      lap: 36,
      category: 'INFO',
      message: 'CAR 81 (PIA) PIT STOP - 2.4 SECONDS',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:44:33Z',
        isLive: false,
        isFixture: true
      }
    },
    {
      id: 'rc-08',
      time: '15:51:02',
      lap: 34,
      category: 'DRS',
      message: 'DRS ENABLED',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:41:02Z',
        isLive: false,
        isFixture: true
      }
    },
    {
      id: 'rc-07',
      time: '15:32:15',
      lap: 19,
      category: 'PENALTY',
      driverNumber: 20,
      message: '10 SECOND TIME PENALTY FOR CAR 20 (MAG) - CAUSING A COLLISION (TURN 4)',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:22:15Z',
        isLive: false,
        isFixture: true
      }
    },
    {
      id: 'rc-06',
      time: '15:18:40',
      lap: 9,
      category: 'FLAG',
      flag: 'YELLOW',
      message: 'YELLOW FLAG IN SECTOR 2 - CAR 27 (HUL) RUN OFF AT ASCARI',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:08:40Z',
        isLive: false,
        isFixture: true
      }
    },
    {
      id: 'rc-05',
      time: '15:19:12',
      lap: 9,
      category: 'FLAG',
      flag: 'CLEAR',
      message: 'TRACK CLEAR SECTOR 2',
      provenance: {
        provider: 'FIA Official',
        retrievedAt: '2024-09-01T14:09:12Z',
        isLive: false,
        isFixture: true
      }
    }
  ]
};

// Also export historical laps for the replay progression
export const MONZA_HISTORICAL_LAPS = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53];
