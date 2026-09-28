import { describe, expect, it } from 'vitest';
import { formatGap, formatInterval } from './timingFormat';

describe('timing delta formatting', () => {
  it('formats numeric gaps with stable three-decimal timing precision', () => {
    expect(formatGap(1.2)).toBe('+1.200');
    expect(formatGap('+2.7')).toBe('+2.700');
  });
  it('preserves leader and empty states', () => {
    expect(formatGap('LEADER')).toBe('LEADER');
    expect(formatInterval('')).toBe('—');
    expect(formatInterval(null)).toBe('—');
  });
  it('does not rewrite non-numeric timing labels', () => {
    expect(formatGap('1 LAP')).toBe('1 LAP');
  });
});
