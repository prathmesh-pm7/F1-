import { GrandPrix, SessionSchedule, SessionDetail, SessionResultEntry, Driver, DataProvenance } from '../types/f1';

const OPENF1_BASE = 'https://api.openf1.org/v1';

type JsonRecord = Record<string, any>;

export class OpenF1Provider {
  public name = 'OpenF1';
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 60_000;

  private async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) return cached.data as T;
    const res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}`);
    const data = await res.json();
    this.cache.set(path, { data, expiry: Date.now() + this.ttl });
    return data as T;
  }

  private sessionName(type: SessionSchedule['type']): string {
    return ({ FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3', QUALIFYING: 'Qualifying', SPRINT_QUALIFYING: 'Sprint Qualifying', SPRINT: 'Sprint', RACE: 'Race' } as Record<string,string>)[type] ?? type;
  }

  private secondsToTime(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    const minutes = Math.floor(n / 60);
    const seconds = n - minutes * 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }

  public async getSessionDetail(gp: GrandPrix, session: SessionSchedule): Promise<SessionDetail> {
    const wanted = this.sessionName(session.type);
    const country = encodeURIComponent(gp.country);
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${gp.season}&country_name=${country}&session_name=${encodeURIComponent(wanted)}`);
    const match = sessions.find(s => Math.abs(new Date(s.date_start).getTime() - new Date(session.startTime).getTime()) < 36 * 60 * 60 * 1000) ?? sessions[0];
    if (!match) throw new Error(`${wanted} data is not published for ${gp.officialName} yet.`);

    const key = Number(match.session_key);
    const [rawResults, rawLaps, rawPit, rawDrivers, meetings] = await Promise.all([
      this.get<JsonRecord[]>(`/session_result?session_key=${key}`),
      this.get<JsonRecord[]>(`/laps?session_key=${key}`),
      this.get<JsonRecord[]>(`/pit?session_key=${key}`),
      this.get<JsonRecord[]>(`/drivers?session_key=${key}`),
      this.get<JsonRecord[]>(`/meetings?year=${gp.season}&country_name=${country}`)
    ]);

    const driverMap = new Map<number, JsonRecord>();
    for (const d of rawDrivers) driverMap.set(Number(d.driver_number), d);
    const toDriver = (d: JsonRecord): Driver => ({
      id: String(d.driver_number), code: String(d.name_acronym ?? '???'), number: Number(d.driver_number),
      firstName: String(d.first_name ?? ''), lastName: String(d.last_name ?? ''), fullName: String(d.full_name ?? ''),
      nationality: '', teamId: String(d.team_name ?? ''), teamName: String(d.team_name ?? '—'),
      teamColor: `#${String(d.team_colour ?? '59636E').replace('#','')}`, headshotUrl: d.headshot_url
    });

    const results: SessionResultEntry[] = rawResults.map(r => {
      const d = driverMap.get(Number(r.driver_number)) ?? {};
      const duration = Array.isArray(r.duration) ? r.duration[0] : r.duration;
      const gap = r.gap_to_leader == null ? (Number(r.position) === 1 ? 'LEADER' : '—') : (typeof r.gap_to_leader === 'number' ? `+${r.gap_to_leader.toFixed(3)}` : String(r.gap_to_leader));
      return { position: Number.isFinite(Number(r.position)) ? Number(r.position) : null, driverNumber: Number(r.driver_number), driverId: String(d.driver_number ?? ''), driverCode: String(d.name_acronym ?? '???'), driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'), teamName: String(d.team_name ?? '—'), teamColor: `#${String(d.team_colour ?? '59636E').replace('#','')}`, bestLap: this.secondsToTime(duration), gap, laps: Number(r.number_of_laps ?? 0), dnf: Boolean(r.dnf), dns: Boolean(r.dns), dsq: Boolean(r.dsq) };
    });

    const laps = rawLaps.map(l => {
      const d = driverMap.get(Number(l.driver_number)) ?? {};
      return { lapNumber: Number(l.lap_number), driverNumber: Number(l.driver_number), driverCode: String(d.name_acronym ?? '???'), driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'), lapTime: this.secondsToTime(l.lap_duration), sector1: this.secondsToTime(l.duration_sector_1), sector2: this.secondsToTime(l.duration_sector_2), sector3: this.secondsToTime(l.duration_sector_3), speedTrap: Number(l.st_speed) || undefined };
    }).filter(l => l.lapNumber > 0);

    const pitStops = rawPit.map(p => { const d=driverMap.get(Number(p.driver_number))??{}; return { driverNumber:Number(p.driver_number), driverCode:String(d.name_acronym??'???'), driverName:String(d.full_name??d.broadcast_name??'Unknown'), lap:Number(p.lap_number), stopDuration:Number(p.stop_duration)||undefined, laneDuration:Number(p.lane_duration)||undefined }; });
    const meeting = meetings[0] ?? {};
    const provenance: DataProvenance = { provider:'OpenF1', sourceUrl:`${OPENF1_BASE}/session_result?session_key=${key}`, retrievedAt:new Date().toISOString(), lastUpdatedAt:new Date().toISOString(), isLive:false, isFixture:false, isHistorical:gp.season < new Date().getFullYear(), notes:'Historical session data from OpenF1' };
    return { sessionKey:key, sessionName:String(match.session_name), sessionType:String(match.session_type), startTime:String(match.date_start), endTime:String(match.date_end), circuitName:String(match.circuit_short_name ?? gp.circuit.name), circuitImageUrl:meeting.circuit_image, results, laps, pitStops, driverLineup:Array.from(driverMap.values()).map(toDriver), provenance };
  }
  public async getSeasonDriverImages(year: number): Promise<Record<string, string>> {
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${year}&session_name=Race`);
    const latest = sessions.sort((a,b) => new Date(String(b.date_start)).getTime() - new Date(String(a.date_start)).getTime())[0];
    if (!latest) return {};
    const drivers = await this.get<JsonRecord[]>(`/drivers?session_key=${Number(latest.session_key)}`);
    return drivers.reduce<Record<string,string>>((map, d) => {
      if (d.headshot_url) {
        map[String(d.driver_number)] = String(d.headshot_url);
        if (d.name_acronym) map[String(d.name_acronym)] = String(d.headshot_url);
      }
      return map;
    }, {});
  }

  public async getSeasonCircuitMeta(year: number): Promise<Record<string, { imageUrl?: string; circuitType?: string }>> {
    const meetings = await this.get<JsonRecord[]>(`/meetings?year=${year}`);
    return meetings.reduce<Record<string, { imageUrl?: string; circuitType?: string }>>((map, meeting) => {
      const key = String(meeting.country_name ?? meeting.circuit_short_name ?? '').toLowerCase();
      if (key) map[key] = { imageUrl: meeting.circuit_image, circuitType: meeting.circuit_type };
      return map;
    }, {});
  }

}
