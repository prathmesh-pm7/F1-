import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimingEntry, LiveSessionSnapshot } from '../../types/f1';
import {
  CircuitGeometry,
  fetchCircuitGeometry,
  getSplinePoint,
  pointsToSvgPath
} from '../../data/circuitGeometries';
import { Maximize2, Radio } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  selectedDriver: TimingEntry | null;
  onSelectDriver: (entry: TimingEntry | null) => void;
  circuitInfoUrl?: string;
  onExpandToFullMap?: () => void;
}

export const MiniTrackRadar: React.FC<Props> = ({
  snapshot,
  selectedDriver,
  onSelectDriver,
  circuitInfoUrl,
  onExpandToFullMap
}) => {
  const [geometry, setGeometry] = useState<CircuitGeometry | null>(null);
  const [simProgress, setSimProgress] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let mounted = true;
    const circuitName = snapshot.circuitName || 'Autodromo Nazionale Monza';
    void fetchCircuitGeometry(circuitName, circuitInfoUrl).then(geom => {
      if (mounted) setGeometry(geom);
    });
    return () => {
      mounted = false;
    };
  }, [snapshot.circuitName, circuitInfoUrl]);

  // Smooth continuous animation
  useEffect(() => {
    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setSimProgress(prev => (prev + (1.0 / 82.0) * delta) % 1.0);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const cars = useMemo(() => {
    if (!geometry || geometry.points.length === 0 || snapshot.entries.length === 0) return [];
    const points = geometry.points;

    return snapshot.entries.map((entry, index) => {
      const gapSeconds = entry.position === 1
        ? 0
        : (entry.gapToLeaderSeconds || (index * 1.8));

      const fractionOffset = (gapSeconds / 82.0) % 1.0;
      const carFraction = (simProgress - fractionOffset + 1.0) % 1.0;

      const spline = getSplinePoint(points, carFraction);
      return {
        driverNumber: entry.driverNumber,
        entry,
        x: spline.x,
        y: spline.y,
        isLeader: entry.position === 1,
        inPit: Boolean(entry.inPit)
      };
    });
  }, [geometry, snapshot.entries, simProgress]);

  if (!geometry) {
    return (
      <div className="f1-mini-radar-empty">
        <span className="text-[10px] text-neutral-500 font-mono">LOADING RADAR…</span>
      </div>
    );
  }

  return (
    <div className="f1-mini-radar">
      <div className="f1-mini-radar-header">
        <div className="flex items-center gap-1.5">
          <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />
          <span className="text-[9px] font-bold tracking-wider text-neutral-200">
            {geometry.name}
          </span>
        </div>
        {onExpandToFullMap && (
          <button
            type="button"
            className="f1-mini-radar-expand-btn"
            onClick={onExpandToFullMap}
            title="Expand to Full 2D Track Map"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            <span>FULL MAP</span>
          </button>
        )}
      </div>

      <div className="f1-mini-radar-svg-wrap">
        <svg viewBox="0 0 1000 650" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Track Outline */}
          <path
            d={pointsToSvgPath(geometry.points)}
            fill="none"
            stroke="#1f2833"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={pointsToSvgPath(geometry.points)}
            fill="none"
            stroke="#323f4f"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cars */}
          {cars.map(car => {
            const isSelected = selectedDriver?.driverNumber === car.driverNumber;
            const teamColor = car.entry.teamColor || '#59636e';

            return (
              <g
                key={car.driverNumber}
                transform={`translate(${car.x}, ${car.y})`}
                onClick={() => onSelectDriver(isSelected ? null : car.entry)}
                style={{ cursor: 'pointer' }}
              >
                {isSelected && (
                  <circle r="18" fill="none" stroke="#ffffff" strokeWidth="2" className="animate-ping" />
                )}
                {car.isLeader && (
                  <circle r="14" fill="none" stroke="#ffd600" strokeWidth="2" opacity="0.9" />
                )}
                <circle
                  r={isSelected ? 11 : car.isLeader ? 9 : 7}
                  fill={teamColor}
                  stroke="#080a0d"
                  strokeWidth="2"
                />
                <text
                  y="2.5"
                  fill="#ffffff"
                  fontSize={car.entry.driverCode.length > 3 ? "5.5" : "6.5"}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {car.entry.driverCode}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
