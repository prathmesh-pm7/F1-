import { Circuit, DataProvenance, Driver, NewsItem, TechnicalUpdate } from '../types/f1';

const OPENF1_BASE = 'https://api.openf1.org/v1';
const FIA_NEWS_RSS = 'https://www.fia.com/rss/news';
const FIA_PRESS_RSS = 'https://www.fia.com/rss/press-release';
const F1_RSS = 'https://www.formula1.com/en/latest/all.xml';
const TEAM_COLORS: Record<string, string> = {
  mclaren: '#FF8000', mercedes: '#27F4D2', red_bull: '#3671C6', ferrari: '#E8002D',
  williams: '#64C4FF', rb: '#6692FF', aston_martin: '#229971', haas: '#B6BABD',
  audi: '#BB0A30', alpine: '#0093CC', cadillac: '#C7C8CA'
};
const LAP_RECORDS: Record<string, { time: string; driver: string; year: number }> = {
  australia: { time: '1:19.813', driver: 'Charles Leclerc', year: 2024 },
  china: { time: '1:32.238', driver: 'Michael Schumacher', year: 2004 },
  japan: { time: '1:30.983', driver: 'Lewis Hamilton', year: 2019 },
  bahrain: { time: '1:31.447', driver: 'Pedro de la Rosa', year: 2005 },
  'saudi arabia': { time: '1:30.734', driver: 'Lewis Hamilton', year: 2021 },
  miami: { time: '1:29.708', driver: 'Max Verstappen', year: 2024 },
  'emilia-romagna': { time: '1:15.484', driver: 'Lewis Hamilton', year: 2020 },
  monaco: { time: '1:12.909', driver: 'Lewis Hamilton', year: 2021 },
  spain: { time: '1:11.383', driver: 'Lando Norris', year: 2024 },
  canada: { time: '1:13.078', driver: 'Valtteri Bottas', year: 2019 },
  austria: { time: '1:05.619', driver: 'Carlos Sainz', year: 2020 },
  'great britain': { time: '1:27.097', driver: 'Max Verstappen', year: 2020 },
  belgium: { time: '1:44.701', driver: 'Sergio Perez', year: 2024 },
  hungary: { time: '1:16.627', driver: 'Lewis Hamilton', year: 2020 },
  netherlands: { time: '1:10.621', driver: 'Lewis Hamilton', year: 2021 },
  italy: { time: '1:21.046', driver: 'Rubens Barrichello', year: 2004 },
  azerbaijan: { time: '1:43.009', driver: 'Charles Leclerc', year: 2019 },
  singapore: { time: '1:34.486', driver: 'Daniel Ricciardo', year: 2024 },
  'united states': { time: '1:36.169', driver: 'Charles Leclerc', year: 2019 },
  'las vegas': { time: '1:34.876', driver: 'Lando Norris', year: 2024 },
  mexico: { time: '1:17.774', driver: 'Valtteri Bottas', year: 2021 },
  brazil: { time: '1:10.540', driver: 'Valtteri Bottas', year: 2018 },
  qatar: { time: '1:22.384', driver: 'Lando Norris', year: 2024 },
  'abu dhabi': { time: '1:22.109', driver: 'Michael Schumacher', year: 2004 },
};
const TEAM_ALIASES: Array<[string, string]> = [
  ['McLaren', 'mclaren'], ['Mercedes', 'mercedes'], ['Red Bull', 'red_bull'], ['Ferrari', 'ferrari'],
  ['Williams', 'williams'], ['Racing Bulls', 'rb'], ['Aston Martin', 'aston_martin'],
  ['Haas', 'haas'], ['Audi', 'audi'], ['Alpine', 'alpine'], ['Cadillac', 'cadillac']
];

type JsonRecord = Record<string, any>;

const clean = (value: string) => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const teamFromText = (value: string) => {
  const hit = TEAM_ALIASES.find(([name]) => value.toLowerCase().includes(name.toLowerCase()));
  return hit?.[0] ?? 'F1';
};
const teamColor = (team: string) => TEAM_COLORS[TEAM_ALIASES.find(([name]) => name === team)?.[1] ?? ''] ?? '#8b929b';

export class F1EnrichmentProvider {
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 5 * 60_000;

  private async getJson<T>(url: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && cached.expiry > Date.now()) return cached.data as T;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`F1 enrichment HTTP ${response.status}`);
    const data = await response.json();
    this.cache.set(url, { data, expiry: Date.now() + this.ttl });
    return data as T;
  }

  private async getText(url: string): Promise<string> {
    const cached = this.cache.get(url);
    if (cached && cached.expiry > Date.now()) return String(cached.data);
    const response = await fetch(url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
    const data = await response.text();
    this.cache.set(url, { data, expiry: Date.now() + this.ttl });
    return data;
  }

  private parseRss(xml: string): Array<{ title: string; link: string; description: string; publishedAt: string }> {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent?.trim() ?? '',
      link: item.querySelector('link')?.textContent?.trim() ?? '',
      description: clean(item.querySelector('description')?.textContent ?? ''),
      publishedAt: item.querySelector('pubDate')?.textContent?.trim() ?? new Date().toISOString()
    })).filter(item => item.title && item.link);
  }

  public async getFiaNews(limit = 20): Promise<NewsItem[]> {
    try {
      const local = await this.getJson<NewsItem[]>('/data/fia-news.json');
      if (Array.isArray(local) && local.length) return local.slice(0, limit);
    } catch { /* fall through to official RSS */ }
    const [newsXml, pressXml] = await Promise.all([
      this.getText(FIA_NEWS_RSS),
      this.getText(FIA_PRESS_RSS)
    ]);
    const provenanceBase: DataProvenance = {
      provider: 'FIA Official',
      retrievedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      isLive: false,
      isFixture: false,
      notes: 'Official FIA RSS feed'
    };
    return [...this.parseRss(newsXml), ...this.parseRss(pressXml)]
      .filter(item => /formula one|formula 1|f1|grand prix|single-seater|world motor sport council|regulation/i.test(item.title + ' ' + item.description))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)
      .map((item, index): NewsItem => ({
        id: `fia-${index}-${item.publishedAt}`,
        title: item.title,
        summary: item.description || 'Official FIA publication.',
        source: 'FIA',
        sourceUrl: item.link,
        publishedAt: item.publishedAt,
        category: /regulation|council|amendment/i.test(item.title) ? 'REGULATIONS' : 'FIA',
        verified: true,
        provenance: { ...provenanceBase, sourceUrl: item.link }
      }));
  }

  public async getTechnicalUpdates(limit = 30): Promise<TechnicalUpdate[]> {
    try {
      const local = await this.getJson<TechnicalUpdate[]>('/data/technical-updates.json');
      if (Array.isArray(local) && local.length) return local.slice(0, limit);
    } catch { /* fall through to official F1 RSS */ }
    const xml = await this.getText(F1_RSS);
    const items = this.parseRss(xml);
    const technicalPattern = /upgrade|technical|floor|diffuser|sidepod|front wing|rear wing|suspension|engine cover|cooling|chassis|power unit|brake duct|aero|car update|new specification/i;
    return items.filter(item => technicalPattern.test(item.title + ' ' + item.description)).slice(0, limit).map((item, index): TechnicalUpdate => {
      const team = teamFromText(item.title + ' ' + item.description);
      const lower = (item.title + ' ' + item.description).toLowerCase();
      const component: TechnicalUpdate['component'] =
        /front wing/.test(lower) ? 'Front Wing' :
        /floor|diffuser/.test(lower) ? 'Floor & Venturi' :
        /sidepod|engine cover|cooling/.test(lower) ? 'Sidepods' :
        /rear wing|beam/.test(lower) ? 'Rear Wing / Beam' :
        /brake duct/.test(lower) ? 'Brake Ducts' :
        /suspension/.test(lower) ? 'Suspension' :
        /power unit|engine/.test(lower) ? 'Power Unit' : 'Chassis & Weight';
      const updateType: TechnicalUpdate['updateType'] =
        /weight|lighter|chassis/.test(lower) ? 'Weight Saving' :
        /cooling/.test(lower) ? 'Cooling' :
        /reliability|failure|problem/.test(lower) ? 'Reliability' : 'Aerodynamic';
      return {
        id: `technical-${index}-${item.publishedAt}`,
        team,
        teamColor: teamColor(team),
        component,
        updateType,
        weekend: 'RECENT',
        submissionDate: new Date(item.publishedAt).toISOString().slice(0, 10),
        summary: item.title,
        technicalDescription: item.description || 'See the original Formula 1 technical report.',
        source: 'Formula 1',
        sourceUrl: item.link,
        status: 'REPORTED',
        provenance: {
          provider: 'Curated Technical',
          sourceUrl: item.link,
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Official Formula 1 technical/news publication; not an FIA filing'
        }
      };
    });
  }

  public async getSeasonCircuitEnrichment(year: number): Promise<Record<string, Partial<Circuit>>> {
    const meetings = await this.getJson<JsonRecord[]>(`${OPENF1_BASE}/meetings?year=${year}`);
    const result: Record<string, Partial<Circuit>> = {};
    await Promise.all(meetings.map(async meeting => {
      const country = String(meeting.country_name ?? '').toLowerCase();
      if (!country) return;
      const base: Partial<Circuit> = {
        imageUrl: meeting.circuit_image,
        circuitType: meeting.circuit_type,
        latitude: Number(meeting.latitude) || undefined,
        longitude: Number(meeting.longitude) || undefined,
        countryFlagUrl: meeting.country_flag,
        circuitInfoUrl: meeting.circuit_info_url,
        lapRecord: LAP_RECORDS[country]
      };
      if (meeting.circuit_info_url) {
        try {
          const info = await this.getJson<JsonRecord>(String(meeting.circuit_info_url));
          const corners = Array.isArray(info.corners) ? info.corners : [];
          result[country] = {
        ...(meeting.circuit_short_name ? { [String(meeting.circuit_short_name).toLowerCase()]: base } : {}),
            ...base,
            turns: corners.length || undefined,
            circuitKey: Number(meeting.circuit_key) || undefined,
            trackRotation: Number(info.rotation) || undefined
          };
        } catch {
          result[country] = { ...base, circuitKey: Number(meeting.circuit_key) || undefined };
        }
      } else {
        result[country] = base;
      }
    }));
    return result;
  }

  public async getSessionDrivers(sessionKey: number): Promise<Driver[]> {
    const rows = await this.getJson<JsonRecord[]>(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`);
    return rows.map(d => ({
      id: String(d.driver_number),
      code: String(d.name_acronym ?? '???'),
      number: Number(d.driver_number),
      firstName: String(d.first_name ?? ''),
      lastName: String(d.last_name ?? ''),
      fullName: String(d.full_name ?? ''),
      nationality: String(d.country_code ?? ''),
      teamId: String(d.team_name ?? ''),
      teamName: String(d.team_name ?? '—'),
      teamColor: `#${String(d.team_colour ?? '59636E').replace('#','')}`,
      headshotUrl: d.headshot_url
    }));
  }
}
