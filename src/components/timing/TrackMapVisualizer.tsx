import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TimingEntry, LiveSessionSnapshot, Team, TrackStatus } from '../../types/f1';
import {
  CircuitGeometry,
  TrackCorner,
  fetchCircuitGeometry,
  getSplinePoint,
  pointsToSvgPath
} from '../../data/circuitGeometries';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Flag,
  Radio,
  Eye,
  Zap,
  Info,
  ChevronRight,
  ShieldAlert,
  Car
} from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  selectedDriver: TimingEntry | null;
  onSelectDriver: (entry: TimingEntry | null) => void;
  favoriteTeam?: Team | null;
  circuitInfoUrl?: string;
  isCompact?: boolean;
}

interface AnimatedCar {
  driverNumber: number;
  entry: TimingEntry;
  x: number;
  y: number;
  angleRad: number;
  fraction: number;
  speedKmH: number;
  inPit: boolean;
  retired: boolean;
  isLeader: boolean;
  isInBattle: boolean;
  battleCarCode?: string;
  drsActive: boolean;
}

const COMPOUND_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  SOFT: { bg: '#e10600', text: '#ffffff', label: 'S' },
  MEDIUM: { bg: '#ffd600', text: '#000000', label: 'M' },
  HARD: { bg: '#f0f0f2', text: '#000000', label: 'H' },
  INTERMEDIATE: { bg: '#39b54a', text: '#ffffff', label: 'I' },
  WET: { bg: '#0072bb', text: '#ffffff', label: 'W' },
  UNKNOWN: { bg: '#59636e', text: '#ffffff', label: '?' }
};

export const TrackMapVisualizer: React.FC<Props> = ({
  snapshot,
  selectedDriver,
  onSelectDriver,
  favoriteTeam,
  circuitInfoUrl,
  isCompact = false
}) => {
  const [geometry, setGeometry] = useState<CircuitGeometry | null>(null);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(true);

  // Display toggles
  const [showCorners, setShowCorners] = useState(true);
  const [showSectors, setShowSectors] = useState(true);
  const [showDrs, setShowDrs] = useState(true);
  const [showSpeedTraps, setShowSpeedTraps] = useState(true);
  const [labelMode, setLabelMode] = useState<'code' | 'pos' | 'both'>('code');
  const [hoveredDriver, setHoveredDriver] = useState<TimingEntry | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<TrackCorner | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgContainerRef = useRef<SVGSVGElement | null>(null);

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const [simProgress, setSimProgress] = useState(0);

  // Load circuit geometry
  useEffect(() => {
    let mounted = true;
    setIsLoadingGeometry(true);

    const circuitName = snapshot.circuitName || 'Autodromo Nazionale Monza';
    void fetchCircuitGeometry(circuitName, circuitInfoUrl)
      .then(geom => {
        if (mounted) {
          setGeometry(geom);
          setIsLoadingGeometry(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoadingGeometry(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [snapshot.circuitName, circuitInfoUrl]);

  // Base lap time in seconds for progress calculation
  const lapDurationSeconds = useMemo(() => {
    if (snapshot.fastestLap?.time) {
      const parts = snapshot.fastestLap.time.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.max(65, Math.min(115, parts[0] * 60 + parts[1]));
      }
    }
    return 82.0; // Default standard F1 lap ~82s
  }, [snapshot.fastestLap?.time]);

  // Smooth continuous animation ticker
  useEffect(() => {
    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Rate of advance around the circuit (1 full lap per lapDurationSeconds)
      const advanceRate = 1.0 / lapDurationSeconds;
      setSimProgress(prev => (prev + advanceRate * delta) % 1.0);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [lapDurationSeconds]);

  // Compute animated car positions on the track
  const cars = useMemo<AnimatedCar[]>(() => {
    if (!geometry || geometry.points.length === 0 || snapshot.entries.length === 0) {
      return [];
    }

    const points = geometry.points;
    const pitPoints = geometry.pitLane;
    const sortedEntries = [...snapshot.entries].sort((a, b) => a.position - b.position);

    // Leader base progress
    const leaderProgress = simProgress;

    // Track total length approximation
    const result: AnimatedCar[] = [];

    // Helper to calculate gap seconds
    const parseGap = (entry: TimingEntry): number => {
      if (entry.position === 1) return 0;
      if (entry.gapToLeaderSeconds && !isNaN(entry.gapToLeaderSeconds)) {
        return entry.gapToLeaderSeconds;
      }
      if (entry.gap && entry.gap.startsWith('+')) {
        const val = parseFloat(entry.gap.replace('+', '').replace('s', ''));
        if (!isNaN(val)) return val;
      }
      // Fallback relative to position
      return (entry.position - 1) * 1.8;
    };

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const gapSeconds = parseGap(entry);

      // Relative fraction behind leader along the closed track loop
      const fractionOffset = (gapSeconds / lapDurationSeconds) % 1.0;
      let carFraction = (leaderProgress - fractionOffset + 1.0) % 1.0;

      // Constrain gently by reported sector if available
      if (entry.currentSector === 1 && geometry.sectors) {
        if (carFraction > geometry.sectors.s1End && carFraction < 0.95) {
          carFraction = (carFraction * 0.3) % geometry.sectors.s1End;
        }
      } else if (entry.currentSector === 2 && geometry.sectors) {
        if (carFraction < geometry.sectors.s1End || carFraction > geometry.sectors.s2End) {
          carFraction = geometry.sectors.s1End + ((carFraction * 0.4) % (geometry.sectors.s2End - geometry.sectors.s1End));
        }
      } else if (entry.currentSector === 3 && geometry.sectors) {
        if (carFraction > geometry.sectors.s1End && carFraction < geometry.sectors.s2End) {
          carFraction = geometry.sectors.s2End + ((carFraction * 0.4) % (1.0 - geometry.sectors.s2End));
        }
      }

      const inPit = Boolean(entry.inPit);
      const retired = Boolean(entry.retired || entry.stopped);

      let x = 0;
      let y = 0;
      let angleRad = 0;
      let normalX = 0;
      let normalY = 0;

      if (inPit && pitPoints && pitPoints.length > 2) {
        // Place in pit lane
        const pitSpline = getSplinePoint(pitPoints, (carFraction * 2) % 1.0);
        x = pitSpline.x;
        y = pitSpline.y;
        angleRad = pitSpline.angleRad;
        normalX = pitSpline.normalX;
        normalY = pitSpline.normalY;
      } else {
        // Main track path
        const spline = getSplinePoint(points, carFraction);
        x = spline.x;
        y = spline.y;
        angleRad = spline.angleRad;
        normalX = spline.normalX;
        normalY = spline.normalY;
      }

      // Check for overtaking battle with adjacent car
      let isInBattle = false;
      let battleCarCode: string | undefined;

      if (i > 0) {
        const carAhead = sortedEntries[i - 1];
        const gapToAhead = Math.abs(gapSeconds - parseGap(carAhead));
        if (gapToAhead <= 1.0) {
          isInBattle = true;
          battleCarCode = carAhead.driverCode;
        }
      }

      // Estimate speed from sector / straight vs corner
      // On straights (normal turns low curvature) ~320 km/h, in corners ~130 km/h
      let speedKmH = entry.speedTrapKmH || (240 + Math.sin(carFraction * Math.PI * 8) * 80);
      if (inPit) speedKmH = 80;
      if (retired) speedKmH = 0;

      result.push({
        driverNumber: entry.driverNumber,
        entry,
        x,
        y,
        angleRad,
        fraction: carFraction,
        speedKmH: Math.round(speedKmH),
        inPit,
        retired,
        isLeader: entry.position === 1,
        isInBattle,
        battleCarCode,
        drsActive: Boolean(isInBattle && !inPit && !retired)
      });
    }

    // Apply lateral offset for cars running close together side-by-side
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const c1 = result[i];
        const c2 = result[j];
        if (c1.inPit || c2.inPit || c1.retired || c2.retired) continue;

        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        if (dist < 22) {
          // Displace along normal
          const spline1 = getSplinePoint(points, c1.fraction);
          c1.x += spline1.normalX * 11;
          c1.y += spline1.normalY * 11;
          c2.x -= spline1.normalX * 11;
          c2.y -= spline1.normalY * 11;
        }
      }
    }

    return result;
  }, [geometry, snapshot.entries, simProgress, lapDurationSeconds]);

  // Safety Car presence
  const safetyCar = useMemo(() => {
    if (!geometry || !snapshot.trackStatus.safetyCarDeployed) return null;
    // Safety car sits slightly ahead of the leader
    const scFraction = (simProgress + 0.04) % 1.0;
    const pt = getSplinePoint(geometry.points, scFraction);
    return {
      x: pt.x,
      y: pt.y,
      speedKmH: 140
    };
  }, [geometry, snapshot.trackStatus.safetyCarDeployed, simProgress]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx / zoom,
      y: dragStartRef.current.panY + dy / zoom
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(prev => Math.max(0.7, Math.min(3.5, prev + zoomDelta)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Sector segments rendering
  const sectorPaths = useMemo(() => {
    if (!geometry || geometry.points.length === 0) return null;
    const pts = geometry.points;
    const s1EndIndex = Math.floor(pts.length * (geometry.sectors?.s1End ?? 0.33));
    const s2EndIndex = Math.floor(pts.length * (geometry.sectors?.s2End ?? 0.67));

    const s1Points = pts.slice(0, s1EndIndex + 1);
    const s2Points = pts.slice(s1EndIndex, s2EndIndex + 1);
    const s3Points = [...pts.slice(s2EndIndex), pts[0]];

    return {
      s1: pointsToSvgPath(s1Points, false),
      s2: pointsToSvgPath(s2Points, false),
      s3: pointsToSvgPath(s3Points, false)
    };
  }, [geometry]);

  // DRS zones rendering
  const drsPaths = useMemo(() => {
    if (!geometry || !geometry.drsZones || geometry.points.length === 0) return [];
    const pts = geometry.points;
    return geometry.drsZones.map((zone, idx) => {
      const startIndex = Math.floor(pts.length * zone.start);
      const endIndex = Math.floor(pts.length * zone.end);
      let zonePoints: [number, number][] = [];
      if (startIndex > endIndex) {
        zonePoints = [...pts.slice(startIndex), ...pts.slice(0, endIndex + 1)];
      } else {
        zonePoints = pts.slice(startIndex, endIndex + 1);
      }
      return {
        id: `drs-${idx}`,
        path: pointsToSvgPath(zonePoints, false),
        name: zone.name || `DRS Zone ${idx + 1}`
      };
    });
  }, [geometry]);

  // Start / finish line coordinates
  const startFinishInfo = useMemo(() => {
    if (!geometry || geometry.points.length < 2) return null;
    const pt0 = geometry.points[0];
    const pt1 = geometry.points[1];
    const dx = pt1[0] - pt0[0];
    const dy = pt1[1] - pt0[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return {
      x1: pt0[0] - nx * 18,
      y1: pt0[1] - ny * 18,
      x2: pt0[0] + nx * 18,
      y2: pt0[1] + ny * 18,
      midX: pt0[0],
      midY: pt0[1]
    };
  }, [geometry]);

  const selectedCar = useMemo(() => {
    if (!selectedDriver) return null;
    return cars.find(c => c.driverNumber === selectedDriver.driverNumber) ?? null;
  }, [selectedDriver, cars]);

  return (
    <div className={`f1-track-visualizer ${isCompact ? 'is-compact' : ''}`}>
      {/* Top Toolbar */}
      <div className="f1-track-toolbar">
        <div className="f1-track-toolbar-left">
          <div className="f1-track-badge">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="font-bold">{geometry?.name || snapshot.circuitName}</span>
          </div>
          {geometry && (
            <div className="f1-track-meta">
              <span>{geometry.lengthKm} KM</span>
              <span>·</span>
              <span>{geometry.corners.length} TURNS</span>
              <span>·</span>
              <span>{geometry.drsZones?.length || 2} DRS ZONES</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="f1-track-toolbar-right">
          {/* Label selector */}
          <div className="f1-track-btn-group" title="Driver Marker Style">
            <button
              type="button"
              className={labelMode === 'code' ? 'is-active' : ''}
              onClick={() => setLabelMode('code')}
            >
              CODE
            </button>
            <button
              type="button"
              className={labelMode === 'pos' ? 'is-active' : ''}
              onClick={() => setLabelMode('pos')}
            >
              POS
            </button>
            <button
              type="button"
              className={labelMode === 'both' ? 'is-active' : ''}
              onClick={() => setLabelMode('both')}
            >
              EXP
            </button>
          </div>

          {/* Feature toggles */}
          <div className="f1-track-btn-group">
            <button
              type="button"
              className={showSectors ? 'is-active' : ''}
              onClick={() => setShowSectors(!showSectors)}
              title="Toggle Sectors (S1, S2, S3)"
            >
              <Layers className="w-3 h-3" />
              <span>SECTORS</span>
            </button>
            <button
              type="button"
              className={showDrs ? 'is-active' : ''}
              onClick={() => setShowDrs(!showDrs)}
              title="Toggle DRS Zones"
            >
              <Zap className="w-3 h-3" />
              <span>DRS</span>
            </button>
            <button
              type="button"
              className={showCorners ? 'is-active' : ''}
              onClick={() => setShowCorners(!showCorners)}
              title="Toggle Corner Numbers"
            >
              <Flag className="w-3 h-3" />
              <span>TURNS</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="f1-track-btn-group">
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(3.5, z + 0.25))}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.7, z - 0.25))}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Track Canvas Container */}
      <div
        className="f1-track-canvas-wrap"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {isLoadingGeometry && (
          <div className="f1-track-loading">
            <div className="f1-track-spinner" />
            <span>CALIBRATING CIRCUIT TELEMETRY…</span>
          </div>
        )}

        <svg
          ref={svgContainerRef}
          viewBox="0 0 1000 650"
          className="f1-track-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow Filter for Leader / Selected Driver */}
            <filter id="car-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Checkered pattern for start/finish line */}
            <pattern id="checkered" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#ffffff" />
              <rect x="4" width="4" height="4" fill="#111115" />
              <rect y="4" width="4" height="4" fill="#111115" />
              <rect x="4" y="4" width="4" height="4" fill="#ffffff" />
            </pattern>

            {/* Subtle technical background grid */}
            <pattern id="tech-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#161b22" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="650" fill="#090c10" />
          <rect width="1000" height="650" fill="url(#tech-grid)" opacity="0.6" />

          {/* Transform group for Pan & Zoom */}
          <g
            transform={`translate(${500 + pan.x}, ${325 + pan.y}) scale(${zoom}) translate(-500, -325)`}
          >
            {geometry && (
              <>
                {/* 1. Track Runoff / Border Ribbon */}
                <path
                  d={pointsToSvgPath(geometry.points)}
                  fill="none"
                  stroke="#1c232e"
                  strokeWidth="24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 2. Track Asphalt Ribbon */}
                <path
                  d={pointsToSvgPath(geometry.points)}
                  fill="none"
                  stroke="#2b3442"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 3. Racing Line Groove */}
                <path
                  d={pointsToSvgPath(geometry.points)}
                  fill="none"
                  stroke="#384354"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.7"
                />

                {/* 4. Sector Highlights (when enabled) */}
                {showSectors && sectorPaths && (
                  <>
                    <path
                      d={sectorPaths.s1}
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    <path
                      d={sectorPaths.s2}
                      fill="none"
                      stroke="#ffd600"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    <path
                      d={sectorPaths.s3}
                      fill="none"
                      stroke="#e040fb"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  </>
                )}

                {/* 5. DRS Activation Straights (when enabled) */}
                {showDrs && drsPaths.map(drs => (
                  <path
                    key={drs.id}
                    d={drs.path}
                    fill="none"
                    stroke="#00e676"
                    strokeWidth="6"
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                ))}

                {/* 6. Pit Lane */}
                {geometry.pitLane && geometry.pitLane.length > 2 && (
                  <>
                    <path
                      d={pointsToSvgPath(geometry.pitLane, false)}
                      fill="none"
                      stroke="#222b37"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={pointsToSvgPath(geometry.pitLane, false)}
                      fill="none"
                      stroke="#ff9800"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      opacity="0.85"
                    />
                    {/* Pit speed marker */}
                    <g transform={`translate(${geometry.pitLane[Math.floor(geometry.pitLane.length / 2)][0]}, ${geometry.pitLane[Math.floor(geometry.pitLane.length / 2)][1] - 12})`}>
                      <rect x="-18" y="-7" width="36" height="14" rx="3" fill="#14181f" stroke="#ff9800" strokeWidth="1" />
                      <text x="0" y="3" fill="#ff9800" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        PIT 80
                      </text>
                    </g>
                  </>
                )}

                {/* 7. Start / Finish Line */}
                {startFinishInfo && (
                  <g>
                    <line
                      x1={startFinishInfo.x1}
                      y1={startFinishInfo.y1}
                      x2={startFinishInfo.x2}
                      y2={startFinishInfo.y2}
                      stroke="url(#checkered)"
                      strokeWidth="5"
                      strokeLinecap="square"
                    />
                    <line
                      x1={startFinishInfo.x1}
                      y1={startFinishInfo.y1}
                      x2={startFinishInfo.x2}
                      y2={startFinishInfo.y2}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* 8. Corner Numbers & Turn Apexes */}
                {showCorners && geometry.corners.map(corner => (
                  <g
                    key={corner.number}
                    transform={`translate(${corner.x}, ${corner.y})`}
                    className="f1-turn-marker"
                    onMouseEnter={() => setHoveredCorner(corner)}
                    onMouseLeave={() => setHoveredCorner(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle r="7.5" fill="#0d1117" stroke="#485363" strokeWidth="1.2" />
                    <text
                      y="2.5"
                      fill="#e6edf3"
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {corner.number}
                    </text>
                  </g>
                ))}

                {/* 9. Safety Car (if deployed) */}
                {safetyCar && (
                  <g transform={`translate(${safetyCar.x}, ${safetyCar.y})`} className="f1-safety-car-marker">
                    <circle r="12" fill="#ffd600" opacity="0.3" className="animate-ping" />
                    <circle r="8" fill="#ffd600" stroke="#000000" strokeWidth="1.5" />
                    <text y="2.5" fill="#000000" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                      SC
                    </text>
                  </g>
                )}

                {/* 10. Active Battle Connection Lines (⚔️) */}
                {cars.filter(c => c.isInBattle).map(c => {
                  const opponent = cars.find(o => o.entry.driverCode === c.battleCarCode);
                  if (!opponent) return null;
                  return (
                    <line
                      key={`battle-${c.driverNumber}-${opponent.driverNumber}`}
                      x1={c.x}
                      y1={c.y}
                      x2={opponent.x}
                      y2={opponent.y}
                      stroke="#ff1744"
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                      opacity="0.75"
                    />
                  );
                })}

                {/* 11. Animated Driver Car Markers */}
                {cars.map(car => {
                  const isSelected = selectedDriver?.driverNumber === car.driverNumber;
                  const isHovered = hoveredDriver?.driverNumber === car.driverNumber;
                  const isFavorite = favoriteTeam && (car.entry.teamName === favoriteTeam.name || car.entry.teamName === favoriteTeam.fullName);
                  const compound = car.entry.tyre.compound || 'UNKNOWN';
                  const compConfig = COMPOUND_COLORS[compound] || COMPOUND_COLORS.UNKNOWN;
                  const teamColor = car.entry.teamColor || '#59636e';

                  const markerRadius = isSelected ? 12 : isHovered ? 11 : 9.5;

                  return (
                    <g
                      key={car.driverNumber}
                      transform={`translate(${car.x}, ${car.y})`}
                      onClick={() => onSelectDriver(isSelected ? null : car.entry)}
                      onMouseEnter={() => setHoveredDriver(car.entry)}
                      onMouseLeave={() => setHoveredDriver(null)}
                      style={{ cursor: 'pointer' }}
                      className={`f1-car-node ${isSelected ? 'is-selected' : ''}`}
                    >
                      {/* Targeting Radar Ring when selected */}
                      {isSelected && (
                        <>
                          <circle r="22" fill="none" stroke={teamColor} strokeWidth="1.5" opacity="0.6" className="animate-ping" />
                          <circle r="18" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
                        </>
                      )}

                      {/* Leader Gold Ring */}
                      {car.isLeader && !isSelected && (
                        <circle r="14" fill="none" stroke="#ffd600" strokeWidth="1.5" opacity="0.8" />
                      )}

                      {/* Favorite Team subtle glow */}
                      {isFavorite && !isSelected && (
                        <circle r="13" fill="none" stroke={teamColor} strokeWidth="1" opacity="0.8" />
                      )}

                      {/* DRS Glow */}
                      {car.drsActive && (
                        <circle r="13" fill="none" stroke="#00e676" strokeWidth="1.5" opacity="0.85" />
                      )}

                      {/* Main Car Badge Body */}
                      <circle
                        r={markerRadius}
                        fill="#0c1017"
                        stroke={teamColor}
                        strokeWidth={isSelected ? 2.5 : 2}
                        filter={isSelected || car.isLeader ? 'url(#car-glow)' : undefined}
                      />

                      {/* Label based on mode */}
                      {labelMode === 'pos' ? (
                        <text
                          y="3"
                          fill="#ffffff"
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          P{car.entry.position}
                        </text>
                      ) : (
                        <text
                          y="2.8"
                          fill="#ffffff"
                          fontSize={car.entry.driverCode.length > 3 ? "6.5" : "7.5"}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          letterSpacing="-0.2px"
                          textAnchor="middle"
                        >
                          {car.entry.driverCode}
                        </text>
                      )}

                      {/* Position Badge (Top Right) when in Expanded / Both mode */}
                      {labelMode === 'both' && (
                        <g transform="translate(8, -8)">
                          <circle r="5" fill="#0d1117" stroke="#ffffff" strokeWidth="0.8" />
                          <text y="2" fill="#ffd600" fontSize="5.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                            {car.entry.position}
                          </text>
                        </g>
                      )}

                      {/* Tyre Compound Indicator Badge (Bottom Right) */}
                      <g transform="translate(7.5, 7.5)">
                        <circle r="3.8" fill={compConfig.bg} stroke="#090c10" strokeWidth="0.8" />
                        <text y="1.4" fill={compConfig.text} fontSize="4.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                          {compConfig.label}
                        </text>
                      </g>

                      {/* In Pit Badge */}
                      {car.inPit && (
                        <g transform="translate(0, -14)">
                          <rect x="-10" y="-4" width="20" height="8" rx="2" fill="#ff9800" />
                          <text y="2.5" fill="#000000" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                            PIT
                          </text>
                        </g>
                      )}

                      {/* Retired Badge */}
                      {car.retired && (
                        <g transform="translate(0, -14)">
                          <rect x="-10" y="-4" width="20" height="8" rx="2" fill="#e10600" />
                          <text y="2.5" fill="#ffffff" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                            OUT
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </g>
        </svg>

        {/* Hovered Turn Tooltip */}
        {hoveredCorner && (
          <div className="f1-turn-tooltip">
            <strong>TURN {hoveredCorner.number}</strong>
            <span>{hoveredCorner.name || 'Apex'}</span>
          </div>
        )}

        {/* Hovered Driver Tooltip */}
        {hoveredDriver && (
          <div className="f1-driver-hover-card" style={{ borderLeftColor: hoveredDriver.teamColor }}>
            <div className="f1-dh-header">
              <span className="f1-dh-pos">P{hoveredDriver.position}</span>
              <strong className="f1-dh-name">{hoveredDriver.driverName}</strong>
              <span className="f1-dh-code">{hoveredDriver.driverCode}</span>
            </div>
            <div className="f1-dh-meta">
              <span>{hoveredDriver.teamName}</span>
              <span>·</span>
              <span>{hoveredDriver.gap}</span>
              <span>·</span>
              <span>{hoveredDriver.tyre.compound} ({hoveredDriver.tyre.age}L)</span>
            </div>
          </div>
        )}

        {/* Safety Car / Flag Status HUD */}
        {snapshot.trackStatus.safetyCarDeployed && (
          <div className="f1-track-flag-hud sc-active">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>SAFETY CAR DEPLOYED — PACK BUNCHED</span>
          </div>
        )}
        {snapshot.trackStatus.virtualSafetyCar && (
          <div className="f1-track-flag-hud vsc-active">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>VIRTUAL SAFETY CAR — REDUCE SPEED</span>
          </div>
        )}
        {snapshot.trackStatus.flag === 'YELLOW' && !snapshot.trackStatus.safetyCarDeployed && (
          <div className="f1-track-flag-hud yellow-active">
            <Flag className="w-4 h-4 text-yellow-400" />
            <span>CAUTION: YELLOW FLAG ON TRACK</span>
          </div>
        )}
      </div>

      {/* Selected Driver Detailed Telemetry Overlay */}
      {selectedCar && (
        <div className="f1-track-selected-hud" style={{ borderLeftColor: selectedCar.entry.teamColor }}>
          <div className="f1-tsh-main">
            <div className="f1-tsh-driver">
              <div className="f1-tsh-pos">P{selectedCar.entry.position}</div>
              <div>
                <div className="f1-tsh-name">
                  {selectedCar.entry.driverName} <span>#{selectedCar.driverNumber}</span>
                </div>
                <div className="f1-tsh-team">{selectedCar.entry.teamName}</div>
              </div>
            </div>

            <div className="f1-tsh-stats">
              <div>
                <span>GAP TO LEADER</span>
                <strong>{selectedCar.entry.gap}</strong>
              </div>
              <div>
                <span>INTERVAL</span>
                <strong>{selectedCar.entry.interval}</strong>
              </div>
              <div>
                <span>SPEED EST.</span>
                <strong className="timing-cell text-emerald-400">{selectedCar.speedKmH} KM/H</strong>
              </div>
              <div>
                <span>TYRE</span>
                <strong>{selectedCar.entry.tyre.compound} ({selectedCar.entry.tyre.age}L)</strong>
              </div>
              <div>
                <span>SECTOR</span>
                <strong>SECTOR {selectedCar.entry.currentSector}</strong>
              </div>
              <div>
                <span>BEST LAP</span>
                <strong className="timing-cell">{selectedCar.entry.bestLapTime}</strong>
              </div>
            </div>
          </div>

          <div className="f1-tsh-actions">
            <button
              type="button"
              className="f1-tsh-open-btn"
              onClick={() => onSelectDriver(selectedCar.entry)}
            >
              <span>TELEMETRY DRAWER</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="f1-tsh-close-btn"
              onClick={() => onSelectDriver(null)}
            >
              DESELECT
            </button>
          </div>
        </div>
      )}

      {/* Mini Driver Standing Ribbon at Bottom */}
      <div className="f1-track-driver-strip">
        {cars.map(c => {
          const isSelected = selectedDriver?.driverNumber === c.driverNumber;
          return (
            <button
              key={c.driverNumber}
              type="button"
              className={`f1-tds-pill ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectDriver(isSelected ? null : c.entry)}
              style={{ borderLeftColor: c.entry.teamColor }}
            >
              <span className="f1-tds-pos">P{c.entry.position}</span>
              <span className="f1-tds-code">{c.entry.driverCode}</span>
              <span className="f1-tds-gap">{c.entry.position === 1 ? 'LEAD' : c.entry.interval}</span>
              {c.inPit && <span className="f1-tds-pit">PIT</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
