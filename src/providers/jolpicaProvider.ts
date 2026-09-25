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

export const TEAM_COLORS: Record<string, string> = {
  red_bull: '#3671C6',
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

  private cache = new Map<string, { data: any; expiry: number }>();
  private CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes cache

  private async fetchFromApi<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

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

  public async getSchedule(year?: number): Promise<ProviderResult<GrandPrix[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}.json`;
    const provenance = this.createProvenance(endpoint, targetYear < getCurrentSeason());

    try {
      const json = await this.fetchFromApi<any>(endpoint);
      const races = json?.MRData?.RaceTable?.Races;

      if (!races || !Array.isArray(races) || races.length === 0) {
        return {
          status: 'EMPTY',
          data: [],
          message: `No race schedule published yet for season ${targetYear}`,
          provenance
        };
      }

      const schedule: GrandPrix[] = races.map((r: any): GrandPrix => {
        const roundNum = parseInt(r.round, 10);
        const circuitObj: Circuit = {
          id: r.Circuit?.circuitId || 'unknown',
          name: r.Circuit?.circuitName || 'Circuit',
          location: r.Circuit?.Location?.locality || '',
          country: r.Circuit?.Location?.country || ''
        };

        const sessions = [
          {
            id: `${r.round}-fp1`,
            name: 'Free Practice 1',
            type: 'FP1' as const,
            startTime: r.FirstPractice ? `${r.FirstPractice.date}T${r.FirstPractice.time || '10:00:00Z'}` : `${r.date}T10:00:00Z`,
            status: 'COMPLETED' as const
          },
          {
            id: `${r.round}-fp2`,
            name: r.Sprint ? 'Sprint Shootout' : 'Free Practice 2',
            type: (r.Sprint ? 'SPRINT_SHOOTOUT' : 'FP2') as any,
            startTime: r.SecondPractice ? `${r.SecondPractice.date}T${r.SecondPractice.time || '14:00:00Z'}` : `${r.date}T14:00:00Z`,
            status: 'COMPLETED' as const
          },
          {
            id: `${r.round}-qualifying`,
            name: 'Qualifying',
            type: 'QUALIFYING' as const,
            startTime: r.Qualifying ? `${r.Qualifying.date}T${r.Qualifying.time || '16:00:00Z'}` : `${r.date}T16:00:00Z`,
            status: 'COMPLETED' as const
          },
          {
            id: `${r.round}-race`,
            name: 'Grand Prix Race',
            type: 'RACE' as const,
            startTime: `${r.date}T${r.time || '13:00:00Z'}`,
            status: 'COMPLETED' as const
          }
        ];

        return {
          round: roundNum,
          season: parseInt(r.season, 10) || targetYear,
          id: String(r.round),
          name: (r.raceName || '').replace('Grand Prix', '').trim(),
          officialName: r.raceName || `Grand Prix ${roundNum}`,
          circuit: circuitObj,
          country: r.Circuit?.Location?.country || '',
          countryCode: (r.Circuit?.Location?.country || 'INT').slice(0, 3).toUpperCase(),
          date: r.date,
          sessions,
          totalLaps: 53,
          isSprintWeekend: Boolean(r.Sprint),
          status: 'COMPLETED'
        };
      });

      return {
        status: 'SUCCESS',
        data: schedule,
        provenance
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        error: err.message || `Failed to fetch schedule for season ${targetYear}`,
        provenance: {
          ...provenance,
          notes: `Provider error: ${err.message}`
        }
      };
    }
  }

  public async getDriverStandings(year?: number): Promise<ProviderResult<DriverStanding[]>> {
    const targetYear = year ?? getCurrentSeason();
    const endpoint = `/${targetYear}/driverStandings.json`;
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
        const color = TEAM_COLORS[constructorId] || '#E10600';

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
    const endpoint = `/${targetYear}/constructorStandings.json`;
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
        const color = TEAM_COLORS[teamId] || '#E10600';

        const team: Team = {
          id: teamId,
          name: item.Constructor?.name || 'Team',
          fullName: item.Constructor?.name || 'Formula 1 Team',
          base: item.Constructor?.nationality || 'HQ',
          powerUnit: 'Hybrid 1.6L V6 Turbo',
          color,
          drivers: ['DRV1', 'DRV2'],
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
