/**
 * Jolpica F1 Ergast API Provider
 * Consumes the free, open-source Jolpica F1 API.
 * Never silently substitutes fake data when the API fails.
 * Explicitly returns ProviderResult<T> with SUCCESS, EMPTY, or ERROR status and DataProvenance.
 */

import {
  F1DataProvider,
  ProviderResult,
  ProviderCapability
} from './types';
import {
  GrandPrix,
  DriverStanding,
  ConstructorStanding,
  Driver,
  Team,
  Circuit,
  DataProvenance
} from '../types/f1';
import { getCurrentSeason } from '../config/season';

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

export const TEAM_COLORS: Record<string, string> = {
  red_bull: '#3671C6',
  audi: '#BB0A30',
  cadillac: '#C7C8CA',
  mclaren: '#FF8000',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  aston_martin: '#229971',
  alpine: '#0093CC',
  williams: '#64C4FF',
  rb: '#6692FF',
  sauber: '#52E252',
  haas: '#B6BABD'
};

export const KNOWN_POWER_UNITS: Record<string, string> = {
  red_bull: 'Red Bull Ford Powertrains',
  rb: 'Red Bull Ford Powertrains',
  ferrari: 'Ferrari',
  haas: 'Ferrari',
  sauber: 'Audi',
  mercedes: 'Mercedes',
  mclaren: 'Mercedes',
  aston_martin: 'Honda',
  williams: 'Mercedes',
  alpine: 'Mercedes',
  audi: 'Audi',
  cadillac: 'Ferrari'
};

export class JolpicaProvider implements F1DataProvider {
  public name = 'Jolpica F1';
  public capabilities: ProviderCapability[] = [
    'calendar',
    'standings',
    'results',
    'qualifying',
    'sprint',
    'circuits',
    'drivers',
    'teams'
  ];

  private cache = new Map<string, { data: unknown; expiry: number }>();
  private CACHE_TTL_MS = 1000 * 30; // keep the calendar/standings close to current time

  private async fetchFromApi<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) return cached.data as T;

    const res = await fetch(`${JOLPICA_BASE}${path}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Jolpica HTTP error: status ${res.status} (${res.statusText})`);
    }

    const json = await res.json();
    this.cache.set(path, {
      data: json,
      expiry: Date.now() + this.CACHE_TTL_MS
    });
    return json;
  }

  private createProvenance(endpoint: string, isHistorical = false): DataProvenance {
    return {
      provider: 'Jolpica F1',
      sourceUrl: `${JOLPICA_BASE}${endpoint}`,
      retrievedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      isLive: false,
      isFixture: false,
      isHistorical,
      notes: 'Fetched from Jolpica F1 Ergast API'
    };
  }

  private sessionStatus(startTime: string, type: string): 'SCHEDULED' | 'UPCOMING' | 'LIVE' | 'COMPLETED' {
    const start = new Date(startTime).getTime();
    if (!Number.isFinite(start)) return 'SCHEDULED';
    const now = Date.now();
    const durationMinutes = type === 'RACE' ? 120 : type === 'SPRINT' ? 60 : 60;
    const end = start + durationMinutes * 60 * 1000;
    if (now < start) return 'UPCOMING';
    if (now < end) return 'LIVE';
    return 'COMPLETED';
  }

  public async getSchedule(year?: number): Promise<ProviderResult<GrandPrix[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}.json`;
    const provenance = this.createProvenance(endpoint, targetYear < getCurrentSeason());

    try {
      const json = await this.fetchFromApi<unknown>(endpoint);
      const races = isRecord(json) && isRecord(json.MRData) && isRecord(json.MRData.RaceTable)
        ? json.MRData.RaceTable.Races : undefined;

      if (!Array.isArray(races) || races.length === 0) {
        return { status: 'EMPTY', data: [], message: `No race schedule published yet for season ${targetYear}`, provenance };
      }

      const schedule: GrandPrix[] = races.map((raw): GrandPrix => {
        const r = isRecord(raw) ? raw : {};
        const roundNum = Number.parseInt(String(r.round ?? '0'), 10);
        const circuit = isRecord(r.Circuit) ? r.Circuit : {};
        const location = isRecord(circuit.Location) ? circuit.Location : {};
        const raceDate = String(r.date ?? '');
        const raceStart = `${raceDate}T${String(r.time ?? '13:00:00Z')}`;
        const sessionFields: Array<{ key: string; name: string; type: 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'SPRINT' | 'RACE' }> = [
          { key: 'FirstPractice', name: 'Free Practice 1', type: 'FP1' },
          { key: 'SecondPractice', name: 'Free Practice 2', type: 'FP2' },
          { key: 'ThirdPractice', name: 'Free Practice 3', type: 'FP3' },
          { key: 'SprintQualifying', name: 'Sprint Qualifying', type: 'QUALIFYING' },
          { key: 'SprintShootout', name: 'Sprint Qualifying', type: 'QUALIFYING' },
          { key: 'Sprint', name: 'Sprint', type: 'SPRINT' },
          { key: 'Qualifying', name: 'Qualifying', type: 'QUALIFYING' },
        ];
        const sessionData: Array<{ id: string; name: string; type: 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'SPRINT' | 'RACE'; startTime: string }> = [];
        for (const field of sessionFields) {
          const rawSession = r[field.key];
          if (!isRecord(rawSession)) continue;
          const date = typeof rawSession.date === 'string' ? rawSession.date : raceDate;
          const time = typeof rawSession.time === 'string' ? rawSession.time : '';
          if (!time) continue;
          sessionData.push({
            id: String(r.round ?? roundNum) + '-' + field.key.toLowerCase(),
            name: field.name,
            type: field.type,
            startTime: date + 'T' + time
          });
        }
        sessionData.push({ id: String(r.round ?? roundNum) + '-race', name: 'Grand Prix Race', type: 'RACE', startTime: raceStart });
        const sessions = sessionData.map(session => ({ ...session, status: this.sessionStatus(session.startTime, session.type) }));
        const now = Date.now();
        const raceTime = new Date(raceStart).getTime();
        const raceEnd = raceTime + 3 * 60 * 60 * 1000;
        const status: GrandPrix['status'] = now >= raceEnd ? 'COMPLETED' : now >= raceTime ? 'CURRENT' : 'UPCOMING';

        const country = String(location.country ?? '');
        const circuitObj: Circuit = {
          id: String(circuit.circuitId ?? 'unknown'),
          name: String(circuit.circuitName ?? 'Circuit'),
          location: String(location.locality ?? ''),
          country
        };

        return {
          round: roundNum,
          season: Number.parseInt(String(r.season ?? targetYear), 10) || targetYear,
          id: String(r.round ?? roundNum),
          name: String(r.raceName ?? '').replace('Grand Prix', '').trim(),
          officialName: String(r.raceName ?? `Grand Prix ${roundNum}`),
          circuit: circuitObj,
          country,
          countryCode: String(location.country ?? '').toUpperCase() || 'INT',
          date: raceDate,
          sessions,
          isSprintWeekend: isRecord(r.Sprint) || isRecord(r.SprintQualifying),
          status
        };
      });

      return { status: 'SUCCESS', data: schedule, provenance };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to fetch schedule for season ${targetYear}`;
      return { status: 'ERROR', error: message, provenance: { ...provenance, notes: `Provider error: ${message}` } };
    }
  }

  public async getDriverStandings(year?: number): Promise<ProviderResult<DriverStanding[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}/driverstandings.json`;
    const provenance = this.createProvenance(endpoint, targetYear < getCurrentSeason());

    try {
      const json = await this.fetchFromApi<any>(endpoint);
      const standingsList = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;

      if (!standingsList || !Array.isArray(standingsList) || standingsList.length === 0) {
        return {
          status: 'EMPTY',
          data: [],
          message: `No driver standings published yet for season ${targetYear}`,
          provenance
        };
      }

      const leaderPoints = parseFloat(standingsList[0]?.points || '0');

      const standings: DriverStanding[] = standingsList.map((item: any): DriverStanding => {
        const pos = parseInt(item.position, 10);
        const points = parseFloat(item.points || '0');
        const constructorId = item.Constructors?.[0]?.constructorId || 'generic';
        const constructorName = item.Constructors?.[0]?.name || 'Constructor';
        const color = TEAM_COLORS[constructorId] || '#8b929b';

        const driver: Driver = {
          id: item.Driver?.driverId || String(pos),
          code: item.Driver?.code || item.Driver?.familyName?.slice(0, 3).toUpperCase() || 'DRV',
          number: parseInt(item.Driver?.permanentNumber || '0', 10),
          firstName: item.Driver?.givenName || '',
          lastName: item.Driver?.familyName || '',
          fullName: `${item.Driver?.givenName || ''} ${item.Driver?.familyName || ''}`.trim(),
          nationality: item.Driver?.nationality || '',
          teamId: constructorId,
          teamName: constructorName,
          teamColor: color,
          points,
          wins: parseInt(item.wins || '0', 10),
          championshipPosition: pos
        };

        return {
          position: pos,
          driver,
          points,
          wins: parseInt(item.wins || '0', 10),
          behindLeader: leaderPoints - points
        };
      });

      return {
        status: 'SUCCESS',
        data: standings,
        provenance
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        error: err.message || `Failed to fetch driver standings for season ${targetYear}`,
        provenance: {
          ...provenance,
          notes: `Provider error: ${err.message}`
        }
      };
    }
  }

  public async getConstructorStandings(year?: number): Promise<ProviderResult<ConstructorStanding[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}/constructorstandings.json`;
    const provenance = this.createProvenance(endpoint, targetYear < getCurrentSeason());

    try {
      const json = await this.fetchFromApi<any>(endpoint);
      const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;

      if (!list || !Array.isArray(list) || list.length === 0) {
        return {
          status: 'EMPTY',
          data: [],
          message: `No constructor standings published yet for season ${targetYear}`,
          provenance
        };
      }

      const leaderPoints = parseFloat(list[0]?.points || '0');

      const standings: ConstructorStanding[] = list.map((item: any): ConstructorStanding => {
        const pos = parseInt(item.position, 10);
        const points = parseFloat(item.points || '0');
        const teamId = item.Constructor?.constructorId || 'generic';
        const color = TEAM_COLORS[teamId] || '#8b929b';

        const team: Team = {
          id: teamId,
          name: item.Constructor?.name || 'Team',
          fullName: item.Constructor?.name || 'Formula 1 Team',
          base: '—',
          powerUnit: KNOWN_POWER_UNITS[teamId] || '—',
          color,
          position: pos,
          points,
          wins: parseInt(item.wins || '0', 10)
        };

        return {
          position: pos,
          team,
          points,
          wins: parseInt(item.wins || '0', 10),
          behindLeader: leaderPoints - points
        };
      });

      return {
        status: 'SUCCESS',
        data: standings,
        provenance
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        error: err.message || `Failed to fetch constructor standings for season ${targetYear}`,
        provenance: {
          ...provenance,
          notes: `Provider error: ${err.message}`
        }
      };
    }
  }

  public async getDrivers(year?: number): Promise<ProviderResult<Driver[]>> {
    const targetYear = year ?? getCurrentSeason();
    const standingsResult = await this.getDriverStandings(targetYear);
    if (standingsResult.status === 'SUCCESS') {
      return {
        status: 'SUCCESS',
        data: standingsResult.data.map(s => s.driver),
        provenance: standingsResult.provenance
      };
    }
    if (standingsResult.status === 'EMPTY') {
      return {
        status: 'EMPTY',
        data: [],
        message: standingsResult.message,
        provenance: standingsResult.provenance
      };
    }
    return {
      status: 'ERROR',
      error: standingsResult.error,
      provenance: standingsResult.provenance
    };
  }

  public async getTeams(year?: number): Promise<ProviderResult<Team[]>> {
    const targetYear = year ?? getCurrentSeason();
    const standingsResult = await this.getConstructorStandings(targetYear);
    if (standingsResult.status === 'SUCCESS') {
      return {
        status: 'SUCCESS',
        data: standingsResult.data.map(s => s.team),
        provenance: standingsResult.provenance
      };
    }
    if (standingsResult.status === 'EMPTY') {
      return {
        status: 'EMPTY',
        data: [],
        message: standingsResult.message,
        provenance: standingsResult.provenance
      };
    }
    return {
      status: 'ERROR',
      error: standingsResult.error,
      provenance: standingsResult.provenance
    };
  }

  public async getCircuits(year?: number): Promise<ProviderResult<Circuit[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}/circuits.json`;
    const provenance = this.createProvenance(endpoint, targetYear < getCurrentSeason());

    try {
      const json = await this.fetchFromApi<any>(endpoint);
      const circuitsList = json?.MRData?.CircuitTable?.Circuits;

      if (!circuitsList || !Array.isArray(circuitsList) || circuitsList.length === 0) {
        return {
          status: 'EMPTY',
          data: [],
          message: `No circuits published yet for season ${targetYear}`,
          provenance
        };
      }

      const circuits: Circuit[] = circuitsList.map((c: any): Circuit => ({
        id: c.circuitId || 'unknown',
        name: c.circuitName || 'Circuit',
        location: c.Location?.locality || '',
        country: c.Location?.country || ''
      }));

      return {
        status: 'SUCCESS',
        data: circuits,
        provenance
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        error: err.message || `Failed to fetch circuits for season ${targetYear}`,
        provenance: {
          ...provenance,
          notes: `Provider error: ${err.message}`
        }
      };
    }
  }
}
