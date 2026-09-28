import curatedData from './curatedCircuits.json';

export interface TrackCorner {
  number: number;
  name?: string;
  x: number;
  y: number;
}

export interface TrackDrsZone {
  start: number;
  end: number;
  detection?: number;
  name?: string;
}

export interface CircuitGeometry {
  id: string;
  name: string;
  country: string;
  lengthKm: number;
  rotation?: number;
  points: [number, number][];
  corners: TrackCorner[];
  pitLane: [number, number][];
  drsZones: TrackDrsZone[];
  sectors: {
    s1End: number;
    s2End: number;
  };
  startFinishIndex: number;
  speedTraps?: Array<{ label: string; fraction: number }>;
}

const CORNER_NAMES: Record<string, Record<number, string>> = {
  monza: {
    1: 'Variante del Rettifilo (T1)',
    2: 'Variante del Rettifilo (T2)',
    3: 'Curva Grande',
    4: 'Variante della Roggia (T4)',
    5: 'Variante della Roggia (T5)',
    6: 'Lesmo 1',
    7: 'Lesmo 2',
    8: 'Variante Ascari (T8)',
    9: 'Variante Ascari (T9)',
    10: 'Variante Ascari (T10)',
    11: 'Curva Parabolica'
  },
  silverstone: {
    1: 'Abbey',
    2: 'Farm Curve',
    3: 'Village',
    4: 'The Loop',
    5: 'Aintree',
    6: 'Wellington Straight',
    7: 'Brooklands',
    8: 'Luffield',
    9: 'Woodcote',
    10: 'Copse',
    11: 'Maggotts',
    12: 'Becketts',
    13: 'Chapel',
    14: 'Hangar Straight',
    15: 'Stowe',
    16: 'Vale',
    17: 'Club (Entry)',
    18: 'Club'
  },
  spa: {
    1: 'La Source',
    2: 'Eau Rouge (T2)',
    3: 'Eau Rouge (T3)',
    4: 'Raidillon',
    5: 'Kemmel Straight',
    7: 'Les Combes',
    8: 'Malmedy',
    9: 'Bruxelles',
    10: 'No Name',
    11: 'Pouhon (T11)',
    12: 'Pouhon (T12)',
    13: 'Fagnes',
    14: 'Campus',
    15: 'Paul Frere',
    16: 'Blanchimont (T16)',
    17: 'Blanchimont (T17)',
    18: 'Bus Stop Chicane (T18)',
    19: 'Bus Stop Chicane (T19)'
  },
  monaco: {
    1: 'Sainte Devote',
    2: 'Beau Rivage',
    3: 'Massenet',
    4: 'Casino',
    5: 'Mirabeau Haute',
    6: 'Fairmont Hairpin',
    7: 'Mirabeau Bas',
    8: 'Portier',
    9: 'Tunnel Entry',
    10: 'Nouvelle Chicane (T10)',
    11: 'Nouvelle Chicane (T11)',
    12: 'Tabac',
    13: 'Louis Chiron',
    14: 'Swimming Pool (T14)',
    15: 'Swimming Pool (T15)',
    16: 'Swimming Pool (T16)',
    17: 'La Rascasse',
    18: 'Anthony Noghes (T18)',
    19: 'Anthony Noghes (T19)'
  }
};

/**
 * Generate smooth pit lane path parallel to the main straight
 */
function createPitLanePath(points: [number, number][], startFrac = 0.94, endFrac = 0.07, offsetDist = 24): [number, number][] {
  if (points.length < 5) return [];
  const startIndex = Math.floor(points.length * startFrac);
  const endIndex = Math.floor(points.length * endFrac);

  const straightPoints: [number, number][] = [];
  if (startIndex > endIndex) {
    for (let i = startIndex; i < points.length; i++) straightPoints.push(points[i]);
    for (let i = 0; i <= endIndex; i++) straightPoints.push(points[i]);
  } else {
    for (let i = startIndex; i <= endIndex; i++) straightPoints.push(points[i]);
  }

  if (straightPoints.length < 2) return [];

  // Compute track normal
  const pitPath: [number, number][] = [];
  for (let i = 0; i < straightPoints.length; i++) {
    const prev = straightPoints[Math.max(0, i - 1)];
    const next = straightPoints[Math.min(straightPoints.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    // normal vector
    const nx = -dy / len;
    const ny = dx / len;

    // Taper at start and end of pit lane
    const t = i / (straightPoints.length - 1);
    const taper = Math.sin(t * Math.PI);
    const currentOffset = offsetDist * Math.min(1, taper * 1.5);

    pitPath.push([
      Math.round(straightPoints[i][0] + nx * currentOffset),
      Math.round(straightPoints[i][1] + ny * currentOffset)
    ]);
  }

  return pitPath;
}

// In-memory cache of parsed circuit geometries
const circuitCache = new Map<string, CircuitGeometry>();

// Load curated circuits into cache
for (const item of (curatedData as any[])) {
  const corners = (item.corners || []).map((c: any) => ({
    number: c.number,
    x: c.x,
    y: c.y,
    name: CORNER_NAMES[item.id]?.[c.number] ?? `Turn ${c.number}`
  }));

  const pitLane = createPitLanePath(item.points, 0.94, 0.07, 26);

  const geom: CircuitGeometry = {
    id: item.id,
    name: item.name,
    country: item.country,
    lengthKm: item.lengthKm,
    rotation: item.rotation,
    points: item.points,
    corners,
    pitLane,
    drsZones: item.drs || [{ start: 0.94, end: 0.06 }],
    sectors: {
      s1End: item.s1 ?? 0.32,
      s2End: item.s2 ?? 0.68
    },
    startFinishIndex: 0,
    speedTraps: [
      { label: 'ST', fraction: 0.97 },
      { label: 'I1', fraction: (item.s1 ?? 0.32) * 0.95 },
      { label: 'I2', fraction: (item.s2 ?? 0.68) * 0.95 }
    ]
  };

  circuitCache.set(item.id.toLowerCase(), geom);
  circuitCache.set(item.name.toLowerCase(), geom);
  circuitCache.set(item.country.toLowerCase(), geom);
}

/**
 * Procedural fallback for any calendar circuit not pre-baked
 */
function createProceduralGeometry(id: string, name: string, country = 'FIA'): CircuitGeometry {
  const points: [number, number][] = [];
  const total = 96;
  const cx = 500;
  const cy = 325;
  const rx = 380;
  const ry = 220;

  for (let i = 0; i <= total; i++) {
    const angle = (i / total) * Math.PI * 2;
    // Characteristic grand prix shape with chicanes and sweeping straights
    const rVar = 1 + 0.18 * Math.sin(3 * angle) - 0.12 * Math.cos(5 * angle) + 0.08 * Math.sin(2 * angle);
    const x = Math.round(cx + rx * rVar * Math.cos(angle));
    const y = Math.round(cy + ry * rVar * Math.sin(angle));
    points.push([x, y]);
  }

  const corners: TrackCorner[] = [
    { number: 1, name: 'Turn 1', x: points[8][0], y: points[8][1] },
    { number: 2, name: 'Turn 2', x: points[14][0], y: points[14][1] },
    { number: 3, name: 'Turn 3', x: points[22][0], y: points[22][1] },
    { number: 4, name: 'Turn 4', x: points[32][0], y: points[32][1] },
    { number: 5, name: 'Turn 5', x: points[42][0], y: points[42][1] },
    { number: 6, name: 'Turn 6', x: points[52][0], y: points[52][1] },
    { number: 7, name: 'Turn 7', x: points[64][0], y: points[64][1] },
    { number: 8, name: 'Turn 8', x: points[74][0], y: points[74][1] },
    { number: 9, name: 'Turn 9', x: points[84][0], y: points[84][1] },
    { number: 10, name: 'Turn 10', x: points[92][0], y: points[92][1] }
  ];

  const pitLane = createPitLanePath(points, 0.94, 0.06, 24);

  return {
    id,
    name,
    country,
    lengthKm: 5.3,
    points,
    corners,
    pitLane,
    drsZones: [
      { start: 0.95, end: 0.05, name: 'Main Straight' },
      { start: 0.40, end: 0.55, name: 'Back Straight' }
    ],
    sectors: { s1End: 0.33, s2End: 0.67 },
    startFinishIndex: 0,
    speedTraps: [
      { label: 'ST', fraction: 0.98 },
      { label: 'I1', fraction: 0.31 },
      { label: 'I2', fraction: 0.65 }
    ]
  };
}

/**
 * Fetch and parse dynamic MultiViewer circuit JSON
 */
export async function fetchCircuitGeometry(
  circuitNameOrId?: string,
  circuitInfoUrl?: string
): Promise<CircuitGeometry> {
  const key = (circuitNameOrId || '').toLowerCase().trim();

  // Check cache first
  if (circuitCache.has(key)) {
    return circuitCache.get(key)!;
  }

  // Check partial name matches
  for (const [cKey, geom] of circuitCache.entries()) {
    if (key.includes(cKey) || cKey.includes(key)) {
      return geom;
    }
  }

  // If a circuitInfoUrl is provided, attempt to fetch live MultiViewer points
  if (circuitInfoUrl) {
    try {
      const res = await fetch(circuitInfoUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const rot = ((data.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const rotate = (x: number, y: number) => [x * cos - y * sin, -(x * sin + y * cos)];

        const rawPoints: [number, number][] = [];
        const step = Math.max(1, Math.floor((data.x?.length || 100) / 100));
        for (let i = 0; i < data.x.length; i += step) {
          rawPoints.push(rotate(data.x[i], data.y[i]) as [number, number]);
        }
        if (rawPoints.length > 0) rawPoints.push([...rawPoints[0]]);

        const minX = Math.min(...rawPoints.map(p => p[0]));
        const maxX = Math.max(...rawPoints.map(p => p[0]));
        const minY = Math.min(...rawPoints.map(p => p[1]));
        const maxY = Math.max(...rawPoints.map(p => p[1]));
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const targetW = 860;
        const targetH = 500;
        const scale = Math.min(targetW / w, targetH / h);
        const offsetX = 70 + (targetW - w * scale) / 2;
        const offsetY = 75 + (targetH - h * scale) / 2;
        const toSvg = (rx: number, ry: number): [number, number] => [
          Math.round(offsetX + (rx - minX) * scale),
          Math.round(offsetY + (ry - minY) * scale)
        ];

        const points = rawPoints.map(p => toSvg(p[0], p[1]));
        const corners = (data.corners || []).map((c: any) => {
          const r = rotate(c.trackPosition.x, c.trackPosition.y);
          const svg = toSvg(r[0], r[1]);
          return {
            number: c.number,
            x: svg[0],
            y: svg[1],
            name: `Turn ${c.number}`
          };
        });

        const pitLane = createPitLanePath(points, 0.94, 0.06, 25);
        const geom: CircuitGeometry = {
          id: key || 'circuit',
          name: data.circuitName || circuitNameOrId || 'Circuit',
          country: data.countryName || '',
          lengthKm: Number(data.length_km || data.length) || 5.0,
          rotation: data.rotation,
          points,
          corners,
          pitLane,
          drsZones: [{ start: 0.94, end: 0.06 }],
          sectors: { s1End: 0.33, s2End: 0.67 },
          startFinishIndex: 0
        };

        circuitCache.set(key, geom);
        return geom;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to Monza if it's Monza/Italy, or to procedural track
  if (key.includes('monza') || key.includes('ital')) {
    return circuitCache.get('monza')!;
  }
  if (key.includes('silver') || key.includes('brit')) {
    return circuitCache.get('silverstone')!;
  }
  if (key.includes('spa') || key.includes('belg')) {
    return circuitCache.get('spa')!;
  }
  if (key.includes('monaco') || key.includes('monte')) {
    return circuitCache.get('monaco')!;
  }
  if (key.includes('bahrain') || key.includes('sakhir')) {
    return circuitCache.get('sakhir')!;
  }
  if (key.includes('austria') || key.includes('spielberg')) {
    return circuitCache.get('red_bull_ring')!;
  }

  // Return procedural geometry and cache
  const procedural = createProceduralGeometry(key || 'circuit', circuitNameOrId || 'Formula 1 Circuit');
  circuitCache.set(key, procedural);
  return procedural;
}

/**
 * Interpolate coordinate and normal vector along track spline at fraction f in [0, 1)
 */
export function getSplinePoint(
  points: [number, number][],
  fraction: number
): { x: number; y: number; angleRad: number; normalX: number; normalY: number } {
  if (points.length === 0) {
    return { x: 500, y: 325, angleRad: 0, normalX: 0, normalY: -1 };
  }
  if (points.length === 1) {
    return { x: points[0][0], y: points[0][1], angleRad: 0, normalX: 0, normalY: -1 };
  }

  const f = Math.max(0, Math.min(0.9999, fraction));
  const totalSegments = points.length - 1;
  const floatIndex = f * totalSegments;
  const i = Math.floor(floatIndex);
  const t = floatIndex - i;

  const p0 = points[i];
  const p1 = points[Math.min(points.length - 1, i + 1)];

  const x = p0[0] + (p1[0] - p0[0]) * t;
  const y = p0[1] + (p1[1] - p0[1]) * t;

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  const angleRad = Math.atan2(dy, dx);
  const normalX = -dy / len;
  const normalY = dx / len;

  return { x, y, angleRad, normalX, normalY };
}

/**
 * Generate SVG path data string from points
 */
export function pointsToSvgPath(points: [number, number][], closed = true): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  if (closed) d += ' Z';
  return d;
}
