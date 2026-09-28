export function formatTimingDelta(value: string | number | null | undefined, empty = '—'): string {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'number') return Number.isFinite(value) ? '+' + value.toFixed(3) : empty;
  const text = String(value).trim();
  if (!text) return empty;
  if (/^(LEADER|—|-)$/i.test(text)) return text.toUpperCase() === 'LEADER' ? 'LEADER' : '—';
  const numeric = Number(text.replace(/^\+/, '').replace(/s$/i, ''));
  if (Number.isFinite(numeric)) return '+' + numeric.toFixed(3);
  return text;
}

export function formatGap(value: string | number | null | undefined): string { return formatTimingDelta(value); }
export function formatInterval(value: string | number | null | undefined): string { return formatTimingDelta(value); }
