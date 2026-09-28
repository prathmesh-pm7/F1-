import { describe, expect, it } from 'vitest';
import { getCurrentSeason, getSeasonChassis, SUPPORTED_HISTORICAL_SEASONS } from './season';

describe('season configuration', () => {
  it('derives the supported range from the current season', () => {
    const current = getCurrentSeason();
    expect(SUPPORTED_HISTORICAL_SEASONS).toEqual([current, current - 1, current - 2, current - 3, current - 4, current - 5]);
  });
  it('returns season-specific chassis facts', () => {
    expect(getSeasonChassis(2026, 'ferrari')).toBe('SF-26');
    expect(getSeasonChassis(2026, 'unknown')).toBeUndefined();
  });
});
