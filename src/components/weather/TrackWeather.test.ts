import { describe, expect, it } from 'vitest';
import { deriveRainfallProbability } from './TrackWeather';
import { LiveSessionSnapshot } from '../../types/f1';

const mockSnapshot = (overrides: Partial<LiveSessionSnapshot> = {}): LiveSessionSnapshot => ({
  sessionName: 'MONZA GP',
  circuitName: 'Autodromo Nazionale Monza',
  currentLap: 38,
  totalLaps: 53,
  trackStatus: {
    status: '1',
    message: 'TRACK CLEAR',
    flag: 'CLEAR',
    safetyCarDeployed: false,
    virtualSafetyCar: false,
    redFlag: false,
    updatedAt: '2024-09-01T14:48:00Z'
  },
  weather: {
    airTemp: 33.6,
    trackTemp: 52.8,
    humidity: 38.4,
    pressure: 994.2,
    windSpeed: 2.1,
    windDirection: 142,
    rainfall: false,
    rainfallProbability: 0
  },
  entries: [],
  raceControl: [],
  provenance: {
    provider: 'Replay Engine',
    retrievedAt: '2024-09-01T14:48:00Z',
    isLive: false,
    isFixture: true
  },
  connectionState: 'REPLAY',
  lastUpdated: '2024-09-01T14:48:00Z',
  ...overrides
});

describe('deriveRainfallProbability', () => {
  it('detects 100% active rain when rainfall boolean is true', () => {
    const snap = mockSnapshot({
      weather: {
        airTemp: 22.0,
        trackTemp: 24.5,
        humidity: 92.0,
        pressure: 998.0,
        windSpeed: 4.5,
        windDirection: 200,
        rainfall: true
      }
    });
    const result = deriveRainfallProbability(snap);
    expect(result.probability).toBe(100);
    expect(result.source).toBe('ACTIVE_RAIN');
    expect(result.riskLevel).toBe('WET');
  });

  it('uses explicit weather.rainfallProbability if provided', () => {
    const snap = mockSnapshot({
      weather: {
        airTemp: 25.0,
        trackTemp: 35.0,
        humidity: 60.0,
        pressure: 1012.0,
        windSpeed: 1.5,
        windDirection: 90,
        rainfall: false,
        rainfallProbability: 45
      }
    });
    const result = deriveRainfallProbability(snap);
    expect(result.probability).toBe(45);
    expect(result.source).toBe('TELEMETRY');
    expect(result.riskLevel).toBe('MODERATE');
  });

  it('extracts official risk of rain from race control messages', () => {
    const snap = mockSnapshot({
      weather: {
        airTemp: 28.0,
        trackTemp: 40.0,
        humidity: 55.0,
        pressure: 1010.0,
        windSpeed: 2.0,
        windDirection: 180,
        rainfall: false,
        rainfallProbability: undefined
      },
      raceControl: [
        {
          id: 'rc-1',
          time: '15:00:00',
          category: 'INFO',
          message: 'RISK OF RAIN FOR THE RACE IS 30%',
          provenance: { provider: 'OpenF1', retrievedAt: '', isLive: false, isFixture: true }
        }
      ]
    });
    const result = deriveRainfallProbability(snap);
    expect(result.probability).toBe(30);
    expect(result.source).toBe('RACE_CONTROL');
    expect(result.riskLevel).toBe('LOW');
  });

  it('reports unavailable when neither telemetry nor an official rain message is present', () => {
    const snap = mockSnapshot({
      weather: {
        airTemp: 26.0,
        trackTemp: 38.0,
        humidity: 85.0,
        pressure: 1002.0,
        windSpeed: 3.0,
        windDirection: 110,
        rainfall: false,
        rainfallProbability: undefined
      },
      raceControl: []
    });
    const result = deriveRainfallProbability(snap);
    expect(result.probability).toBe(0);
    expect(result.source).toBe('UNAVAILABLE');
    expect(result.forecastNote).toContain('Awaiting');
  });
});
