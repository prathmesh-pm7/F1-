import { describe, expect, it } from 'vitest';
import { parseLapSeconds, secondsToLapStr } from './QualifyingView';
import { TimingEntry } from '../../types/f1';

describe('QualifyingView utility functions', () => {
  it('parses valid lap time strings into seconds correctly', () => {
    expect(parseLapSeconds('1:21.432')).toBeCloseTo(81.432);
    expect(parseLapSeconds('1:19.890')).toBeCloseTo(79.89);
    expect(parseLapSeconds('81.432')).toBeCloseTo(81.432);
    expect(parseLapSeconds('—')).toBeNull();
    expect(parseLapSeconds('')).toBeNull();
  });

  it('converts seconds into standard F1 lap time strings', () => {
    expect(secondsToLapStr(81.432)).toBe('1:21.432');
    expect(secondsToLapStr(79.05)).toBe('1:19.050');
    expect(secondsToLapStr(0)).toBe('—');
  });
});
