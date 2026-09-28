/** Central season configuration for F1 Pulse. */

export function getCurrentSeason(): number {
  return new Date().getUTCFullYear();
}

export const SUPPORTED_HISTORICAL_SEASONS = Array.from(
  { length: 6 },
  (_, offset) => getCurrentSeason() - offset
);

export const SEASON_CHASSIS: Record<number, Record<string, string>> = {
  2026: {
    mclaren: 'MCL40', mercedes: 'W17', red_bull: 'RB22', ferrari: 'SF-26',
    williams: 'FW48', rb: 'VCARB03', aston_martin: 'AMR26', haas: 'VF-26',
    audi: 'R26', alpine: 'A526', cadillac: 'MAC-26'
  }
};

export function getSeasonChassis(season: number, teamId: string): string | undefined {
  return SEASON_CHASSIS[season]?.[teamId];
}

export const DEFAULT_FALLBACK_SEASON = getCurrentSeason();
