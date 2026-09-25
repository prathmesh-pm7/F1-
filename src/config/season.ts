/**
 * Central season configuration for F1 Pulse.
 * Determines current active season dynamically, while supporting historical seasons.
 */

export function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  // F1 season typically starts around March. If in January or February, previous season might still be latest finalized,
  // but current racing season calendar belongs to the current year.
  return year;
}

export const SUPPORTED_HISTORICAL_SEASONS = [
  2026, 2025, 2024, 2023, 2022, 2021
];

export const DEFAULT_FALLBACK_SEASON = 2024;
