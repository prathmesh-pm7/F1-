import { GrandPrix, SessionSchedule, SessionDetail, SessionResultEntry, Driver, DataProvenance, RaceControlMessage } from '../types/f1';

const OPENF1_BASE = 'https://api.openf1.org/v1';

type JsonRecord = Record<string, any>;

export class OpenF1Provider {
  public name = 'OpenF1';
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 5 * 60_000;
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;
  private minRequestGap = 350;

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  private async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) return cached.data as T;

    // OpenF1 is rate limited. Serialize uncached requests so a Promise.all of
    // session endpoints does not burst the public API with simultaneous calls.
    let release!: () => void;
    const turn = new Promise<void>(resolve => { release = resolve; });
    const previous = this.requestQueue;
    this.requestQueue = previous.then(() => turn);
    await previous;
    try {
      const gap = Date.now() - this.lastRequestAt;
      if (gap < this.minRequestGap) await this.sleep(this.minRequestGap - gap);

      let res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
      this.lastRequestAt = Date.now();
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 15_000)
          : 5_000;
        await this.sleep(waitMs);
        res = await fetch(`${OPENF1_BASE}${path}`, { headers: { Accept: 'application/json' } });
        this.lastRequestAt = Date.now();
      }
      if (!res.ok) {
        if (res.status === 429) throw new Error('OpenF1 rate limited. Please retry in a few seconds.');
        throw new Error(`OpenF1 HTTP ${res.status}`);
      }
      const data = await res.json();
      this.cache.set(path, { data, expiry: Date.now() + this.ttl });
      return data as T;
    } finally {
      release();
    }
  }

  private sessionName(type: SessionSchedule['type']): string {
    return ({ FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3', QUALIFYING: 'Qualifying', SPRINT_QUALIFYING: 'Sprint Qualifying', SPRINT: 'Sprint', RACE: 'Race' } as Record<string,string>)[type] ?? type;
  }

  private normalizeWeather(rows: JsonRecord[]): SessionDetail['weather'] {
    const row = rows
      .filter(item => item && typeof item === 'object')
      .sort((a, b) => new Date(String(a.date ?? '')).getTime() - new Date(String(b.date ?? '')).getTime())
      .at(-1);
    if (!row) return undefined;
    const numberOrUndefined = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };
    const airTemp = numberOrUndefined(row.air_temperature);
    const trackTemp = numberOrUndefined(row.track_temperature);
    const humidity = numberOrUndefined(row.humidity);
    const pressure = numberOrUndefined(row.pressure);
    const windSpeed = numberOrUndefined(row.wind_speed);
    const windDirection = numberOrUndefined(row.wind_direction);
    if ([airTemp, trackTemp, humidity, pressure, windSpeed, windDirection].some(value => value === undefined)) return undefined;
    return {
      airTemp: airTemp!,
      trackTemp: trackTemp!,
      humidity: humidity!,
      pressure: pressure!,
      windSpeed: windSpeed!,
      windDirection: windDirection!,
      rainfall: Boolean(row.rainfall)
    };
  }

  private normalizeRaceControl(rows: JsonRecord[], sessionKey: number): SessionDetail['raceControl'] {
    if (!rows.length) return [];
    const provenanceBase: DataProvenance = {
      provider: 'OpenF1',
      sourceUrl: `${OPENF1_BASE}/race_control?session_key=${sessionKey}`,
      retrievedAt: new Date().toISOString(),
      isLive: false,
      isFixture: false,
      isHistorical: true,
      notes: 'Historical OpenF1 race-control messages'
    };
    return rows.map((row, index) => {
      const message = String(row.message ?? row.category ?? 'Race control update');
      const rawCategory = String(row.category ?? '').toUpperCase();
      const rawFlag = String(row.flag ?? '').toUpperCase();
      const category: RaceControlMessage['category'] =
        rawCategory.includes('FLAG') || rawFlag ? 'FLAG' :
        rawCategory.includes('SAFETY') || /safety car|virtual safety car/i.test(message) ? 'SAFETY_CAR' :
        rawCategory.includes('INVEST') ? 'INVESTIGATION' :
        rawCategory.includes('PENAL') ? 'PENALTY' :
        rawCategory.includes('TRACK') || /track limit/i.test(message) ? 'TRACK_LIMITS' :
        rawCategory.includes('DRS') ? 'DRS' : 'INFO';
      const flagMap: Record<string, RaceControlMessage['flag']> = {
        GREEN: 'GREEN', YELLOW: 'YELLOW', DOUBLE_YELLOW: 'DOUBLE_YELLOW', RED: 'RED',
        BLUE: 'BLUE', CHEQUERED: 'CHEQUERED', CLEAR: 'CLEAR'
      };
      return {
        id: String(row.id ?? `openf1-${sessionKey}-rc-${index}`),
        time: String(row.date ?? row.time ?? ''),
        lap: Number(row.lap_number) > 0 ? Number(row.lap_number) : undefined,
        category,
        flag: flagMap[rawFlag],
        driverNumber: Number(row.driver_number) > 0 ? Number(row.driver_number) : undefined,
        message,
        provenance: { ...provenanceBase, sourceUrl: `${OPENF1_BASE}/race_control?session_key=${sessionKey}` }
      };
    });
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
    const target = new Date(session.startTime).getTime();
    const match = sessions
      .filter(s => Number.isFinite(new Date(String(s.date_start)).getTime()))
      .filter(s => Math.abs(new Date(String(s.date_start)).getTime() - target) < 36 * 60 * 60 * 1000)
      .sort((a, b) => Math.abs(new Date(String(a.date_start)).getTime() - target) - Math.abs(new Date(String(b.date_start)).getTime() - target))[0];
    if (!match) throw new Error(`${wanted} data is not published for ${gp.officialName} in ${gp.season}.`);

    const key = Number(match.session_key);
    const [rawResults, rawLaps, rawPit, rawDrivers, rawPositions, rawWeather, rawRaceControl, meetings] = await Promise.all([
      this.get<JsonRecord[]>(`/session_result?session_key=${key}`),
      this.get<JsonRecord[]>(`/laps?session_key=${key}`),
      this.get<JsonRecord[]>(`/pit?session_key=${key}`),
      this.get<JsonRecord[]>(`/drivers?session_key=${key}`),
      this.get<JsonRecord[]>(`/position?session_key=${key}`),
      this.get<JsonRecord[]>(`/weather?session_key=${key}`),
      this.get<JsonRecord[]>(`/race_control?session_key=${key}`),
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

    // Some historical practice sessions have a complete position stream even when
    // /session_result is delayed. Keep the classification usable by falling back to
    // each driver's latest recorded position in that session.
    const latestPosition = new Map<number, number>();
    const latestPositionTimestamp = new Map<number, number>();
    for (const p of rawPositions) {
      const driverNumber = Number(p.driver_number);
      const position = Number(p.position);
      if (!Number.isFinite(driverNumber) || !Number.isFinite(position)) continue;
      const timestamp = new Date(String(p.date)).getTime();
      const previousTimestamp = latestPositionTimestamp.get(driverNumber);
      if (!Number.isFinite(timestamp)) continue;
      if (previousTimestamp == null || timestamp >= previousTimestamp) {
        latestPosition.set(driverNumber, position);
        latestPositionTimestamp.set(driverNumber, timestamp);
      }
    }
    const resultRows = rawResults.length > 0 ? rawResults : Array.from(driverMap.keys()).map(driver_number => ({
      driver_number,
      position: latestPosition.get(driver_number),
      duration: undefined,
      gap_to_leader: undefined,
      number_of_laps: 0,
      dnf: false, dns: false, dsq: false
    }));

    const results: SessionResultEntry[] = resultRows.map(r => {
      const d = driverMap.get(Number(r.driver_number)) ?? {};
      const duration = Array.isArray(r.duration) ? r.duration[0] : r.duration;
      const gap = r.gap_to_leader == null ? (Number(r.position) === 1 ? 'LEADER' : '—') : (typeof r.gap_to_leader === 'number' ? `+${r.gap_to_leader.toFixed(3)}` : String(r.gap_to_leader));
      return { position: Number.isFinite(Number(r.position)) ? Number(r.position) : (latestPosition.get(Number(r.driver_number)) ?? null), driverNumber: Number(r.driver_number), driverId: String(d.driver_number ?? ''), driverCode: String(d.name_acronym ?? '???'), driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'), teamName: String(d.team_name ?? '—'), teamColor: `#${String(d.team_colour ?? '59636E').replace('#','')}`, bestLap: this.secondsToTime(duration), gap, laps: Number(r.number_of_laps ?? 0), dnf: Boolean(r.dnf), dns: Boolean(r.dns), dsq: Boolean(r.dsq) };
    });

    const laps = rawLaps.map(l => {
      const d = driverMap.get(Number(l.driver_number)) ?? {};
      return { lapNumber: Number(l.lap_number), driverNumber: Number(l.driver_number), driverCode: String(d.name_acronym ?? '???'), driverName: String(d.full_name ?? d.broadcast_name ?? 'Unknown'), lapTime: this.secondsToTime(l.lap_duration), sector1: this.secondsToTime(l.duration_sector_1), sector2: this.secondsToTime(l.duration_sector_2), sector3: this.secondsToTime(l.duration_sector_3), speedTrap: Number(l.st_speed) || undefined };
    }).filter(l => l.lapNumber > 0);

    const pitStops = rawPit.map(p => { const d=driverMap.get(Number(p.driver_number))??{}; return { driverNumber:Number(p.driver_number), driverCode:String(d.name_acronym??'???'), driverName:String(d.full_name??d.broadcast_name??'Unknown'), lap:Number(p.lap_number), stopDuration:Number(p.stop_duration)||undefined, laneDuration:Number(p.lane_duration)||undefined }; });
    const meeting = meetings[0] ?? {};
    const weather = this.normalizeWeather(rawWeather);
    const raceControl = this.normalizeRaceControl(rawRaceControl, key);
    const provenance: DataProvenance = { provider:'OpenF1', sourceUrl:`${OPENF1_BASE}/session_result?session_key=${key}`, retrievedAt:new Date().toISOString(), lastUpdatedAt:new Date().toISOString(), isLive:false, isFixture:false, isHistorical:true, notes:'Historical session data from OpenF1' };
    return { sessionKey:key, sessionName:String(match.session_name), sessionType:String(match.session_type), startTime:String(match.date_start), endTime:String(match.date_end), circuitName:String(match.circuit_short_name ?? gp.circuit.name), circuitImageUrl:meeting.circuit_image, results, laps, pitStops, driverLineup:Array.from(driverMap.values()).map(toDriver), weather, raceControl, provenance };
  }
  public async getSeasonDriverImages(year: number): Promise<Record<string, string>> {
    // Always prefer the current-season F1 headshots returned by OpenF1's latest
    // completed race. These URLs point at Formula 1's official driver assets and
    // therefore follow the driver's current team presentation rather than a
    // historical team image.
    const sessions = await this.get<JsonRecord[]>(`/sessions?year=${year}&session_name=Race`);
    const latest = sessions
      .filter(s => new Date(String(s.date_start)).getTime() <= Date.now())
      .sort((a,b) => new Date(String(b.date_start)).getTime() - new Date(String(a.date_start)).getTime())[0];

    const drivers = latest
      ? await this.get<JsonRecord[]>(`/drivers?session_key=${Number(latest.session_key)}`)
      : [];

    const images = drivers.reduce<Record<string,string>>((map, d) => {
      if (d.headshot_url) {
        const url = String(d.headshot_url);
        map[String(d.driver_number)] = url;
        if (d.name_acronym) map[String(d.name_acronym)] = url;
      }
      return map;
    }, {});

    // Pin the 2026 directory to the canonical current-season driver assets exposed
    // by OpenF1. These are the Formula 1 media headshots for the 2026 team kits.
    // Always override the provider value for 2026 so a cached/stale image from an
    // earlier team assignment cannot put a driver in the wrong kit.
    if (year === 2026) {
      const current2026: Record<string,string> = {
        '1':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.webp',
        '3':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.webp',
        '5':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/audi/gabbor01/2026audigabbor01right.webp',
        '6':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.webp',
        '10':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.webp',
        '11':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.webp',
        '12':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp',
        '14':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.webp',
        '16':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.webp',
        '18':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.webp',
        '23':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp',
        '27':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.webp',
        '30':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.webp',
        '31':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/haas/estoco01/2026haasestoco01right.webp',
        '41':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp',
        '43':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/alpine/fracol01/2026alpinefracol01right.webp',
        '44':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.webp',
        '55':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/williams/carsai01/2026williamscarsai01right.webp',
        '63':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.webp',
        '77':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.webp',
        '81':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.webp',
        '87':'https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/haas/olibea01/2026haasolibea01right.webp'
      };
      const acronymByNumber: Record<string,string> = {
        '1':'NOR','3':'VER','5':'BOR','6':'HAD','10':'GAS','11':'PER','12':'ANT','14':'ALO',
        '16':'LEC','18':'STR','23':'ALB','27':'HUL','30':'LAW','31':'OCO','41':'LIN','43':'COL',
        '44':'HAM','55':'SAI','63':'RUS','77':'BOT','81':'PIA','87':'BEA'
      };
      for (const [number, url] of Object.entries(current2026)) {
        images[number] = url;
      }
      for (const [number, acronym] of Object.entries(acronymByNumber)) {
        images[acronym] = current2026[number];
      }
    }

    return images;
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
