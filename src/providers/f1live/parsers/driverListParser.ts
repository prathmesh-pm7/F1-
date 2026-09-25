import { Driver } from '../../../types/f1';
import { TEAM_COLORS } from '../../jolpicaProvider';

/**
 * Parses DriverList stream.
 * In F1 SignalR, DriverList is a keyed dictionary:
 * {
 *   "1": { RacingNumber: "1", BroadcastName: "M VERSTAPPEN", CountryCode: "NED", FirstName: "Max", LastName: "Verstappen", Line: 1, TeamName: "Red Bull Racing", TeamColour: "3671C6", Tla: "VER" }
 * }
 */
export function parseDriverList(raw: any): Map<number, Partial<Driver>> {
  const map = new Map<number, Partial<Driver>>();
  if (!raw || typeof raw !== 'object') return map;

  const entries = Object.entries(raw);
  for (const [key, val] of entries) {
    if (!val || typeof val !== 'object') continue;
    const v = val as any;
    const num = parseInt(v.RacingNumber || key, 10);
    if (isNaN(num)) continue;

    const teamColRaw = v.TeamColour || v.TeamColor;
    const teamColor = teamColRaw ? (teamColRaw.startsWith('#') ? teamColRaw : `#${teamColRaw}`) : '#E10600';

    map.set(num, {
      number: num,
      code: v.Tla || v.BroadcastName?.slice(0, 3)?.toUpperCase() || 'DRV',
      firstName: v.FirstName || '',
      lastName: v.LastName || '',
      fullName: v.FullName || (v.FirstName && v.LastName ? `${v.FirstName} ${v.LastName}` : v.BroadcastName || `Driver #${num}`),
      teamName: v.TeamName || 'Formula 1 Team',
      teamColor,
      nationality: v.CountryCode || ''
    });
  }

  return map;
}
