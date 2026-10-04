import React, { useMemo } from 'react';
import { TimingEntry, TyreCompound, LapTelemetry } from '../../types/f1';
import { Shield, AlertTriangle, Flame, Clock, Gauge, Activity, RotateCcw } from 'lucide-react';

interface Props {
  entry: TimingEntry;
  completedLaps?: LapTelemetry[];
  trackTemp?: number;
  circuitName?: string;
  className?: string;
  compact?: boolean;
}

export interface TyreWearAnalysis {
  compound: TyreCompound;
  lapsUsed: number;
  maxRecommendedLaps: number;
  effectiveMaxLaps: number;
  percentageRemaining: number;
  lapsRemaining: number;
  degRateSecondsPerLap: number;
  paceLossSeconds: number;
  status: 'OPTIMAL' | 'GOOD' | 'MODERATE' | 'CLIFF WARNING' | 'CRITICAL';
  statusColor: string;
  compoundColor: string;
  compoundBorderColor: string;
  thermalFactor: number;
  telemetryTrendText: string;
  wheelWear: {
    fl: number; // Front Left %
    fr: number; // Front Right %
    rl: number; // Rear Left %
    rr: number; // Rear Right %
  };
}

/**
 * Calculates tyre degradation, wear percentage, and estimated life remaining
 * based on compound characteristics, lap count, track temperature, and historical lap telemetry.
 */
export function calculateTyreWear(
  entry: TimingEntry,
  completedLaps?: LapTelemetry[],
  trackTemp: number = 35
): TyreWearAnalysis {
  const compound = entry.tyre?.compound || 'UNKNOWN';
  const age = Math.max(0, entry.tyre?.age ?? 0);

  // 1. Compound base max usable laps before dramatic cliff
  let baseMaxLaps = 32;
  let baseDegSeconds = 0.042;
  let compoundColor = '#eab308'; // Medium yellow
  let compoundBorderColor = '#ca8a04';

  switch (compound) {
    case 'SOFT':
      baseMaxLaps = 20;
      baseDegSeconds = 0.068;
      compoundColor = '#ef4444'; // Red
      compoundBorderColor = '#dc2626';
      break;
    case 'MEDIUM':
      baseMaxLaps = 32;
      baseDegSeconds = 0.042;
      compoundColor = '#facc15'; // Yellow
      compoundBorderColor = '#eab308';
      break;
    case 'HARD':
      baseMaxLaps = 46;
      baseDegSeconds = 0.026;
      compoundColor = '#f8fafc'; // White
      compoundBorderColor = '#cbd5e1';
      break;
    case 'INTERMEDIATE':
      baseMaxLaps = 28;
      baseDegSeconds = 0.052;
      compoundColor = '#22c55e'; // Green
      compoundBorderColor = '#16a34a';
      break;
    case 'WET':
      baseMaxLaps = 38;
      baseDegSeconds = 0.048;
      compoundColor = '#3b82f6'; // Blue
      compoundBorderColor = '#2563eb';
      break;
    default:
      baseMaxLaps = 30;
      baseDegSeconds = 0.040;
      compoundColor = '#94a3b8';
      compoundBorderColor = '#64748b';
  }

  // 2. Track Temperature thermal modifier (standard benchmark is ~35°C)
  // High track temperatures accelerate thermal degradation
  let thermalFactor = 1.0;
  if (trackTemp > 35) {
    // Every 5°C above 35°C increases thermal degradation by ~4-5%
    thermalFactor = 1.0 + (trackTemp - 35) * 0.009;
  } else if (trackTemp > 0 && trackTemp < 25) {
    thermalFactor = 0.94; // Slower degradation in cool conditions
  }

  // 3. Historical telemetry pace degradation trend
  let observedDegRate = baseDegSeconds;
  let telemetryTrendText = 'Standard degradation model';

  if (completedLaps && completedLaps.length >= 4) {
    // Filter laps for this driver within the current stint
    const driverLaps = completedLaps
      .filter(l => l.driverNumber === entry.driverNumber && (l.lapDuration != null && l.lapDuration > 0))
      .slice(-Math.min(age, 8));

    if (driverLaps.length >= 4) {
      const times = driverLaps.map(l => l.lapDuration as number);
      // Slope using simple least squares or delta over window
      const n = times.length;
      const firstHalf = times.slice(0, Math.floor(n / 2));
      const secondHalf = times.slice(Math.floor(n / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const lapDelta = (avgSecond - avgFirst) / Math.max(1, Math.floor(n / 2));

      // Sanity check: degradation in F1 is typically between -0.15s (fuel burn-off overcoming wear) and +0.35s/lap
      if (Number.isFinite(lapDelta) && lapDelta > -0.2 && lapDelta < 0.5) {
        // Blended with baseline to avoid noise from traffic or pit out laps
        observedDegRate = Math.max(0.01, (baseDegSeconds * 0.4) + (Math.max(0, lapDelta) * 0.6));
        telemetryTrendText = `Telemetry pace wear: +${observedDegRate.toFixed(3)}s/lap`;
      }
    }
  }

  // 4. Calculate effective max laps for this session & conditions
  const effectiveMaxLaps = Math.max(10, Math.round(baseMaxLaps / thermalFactor));

  // 5. Non-linear wear model:
  // F1 tyres have an initial scrub-in, an operating plateau, and then an exponential cliff
  const wearRatio = age / effectiveMaxLaps;
  let percentageRemaining = 100;

  if (wearRatio >= 1.0) {
    // Past cliff: residual grip between 0% and 5%
    const overshoot = wearRatio - 1.0;
    percentageRemaining = Math.max(0, Math.round(5 - overshoot * 15));
  } else {
    // Non-linear curve (power of 1.18 gives realistic progression where tyre holds good grip then drops quickly)
    percentageRemaining = Math.max(0, Math.min(100, Math.round((1 - Math.pow(wearRatio, 1.18)) * 100)));
  }

  // Laps remaining before cliff threshold (~15% life)
  const lapsRemaining = Math.max(0, Math.round(effectiveMaxLaps - age));

  // Accumulated lap-time pace deficit due to wear
  const paceLossSeconds = Math.max(0, age * observedDegRate);

  // Status classification
  let status: TyreWearAnalysis['status'] = 'OPTIMAL';
  let statusColor = '#22c55e'; // emerald-500

  if (percentageRemaining <= 15 || age >= effectiveMaxLaps) {
    status = 'CRITICAL';
    statusColor = '#ef4444'; // red-500
  } else if (percentageRemaining <= 35 || lapsRemaining <= 4) {
    status = 'CLIFF WARNING';
    statusColor = '#f97316'; // orange-500
  } else if (percentageRemaining <= 60) {
    status = 'MODERATE';
    statusColor = '#eab308'; // yellow-500
  } else if (percentageRemaining <= 84) {
    status = 'GOOD';
    statusColor = '#84cc16'; // lime-500
  }

  // Simulated per-wheel wear distribution based on circuit load (e.g. front-left typically takes highest load on clockwise tracks)
  const flMod = 1.05;
  const frMod = 0.96;
  const rlMod = 1.02;
  const rrMod = 0.97;

  const wheelWear = {
    fl: Math.max(0, Math.min(100, Math.round(percentageRemaining * (2 - flMod)))),
    fr: Math.max(0, Math.min(100, Math.round(percentageRemaining * (2 - frMod)))),
    rl: Math.max(0, Math.min(100, Math.round(percentageRemaining * (2 - rlMod)))),
    rr: Math.max(0, Math.min(100, Math.round(percentageRemaining * (2 - rrMod))))
  };

  return {
    compound,
    lapsUsed: age,
    maxRecommendedLaps: baseMaxLaps,
    effectiveMaxLaps,
    percentageRemaining,
    lapsRemaining,
    degRateSecondsPerLap: observedDegRate,
    paceLossSeconds,
    status,
    statusColor,
    compoundColor,
    compoundBorderColor,
    thermalFactor,
    telemetryTrendText,
    wheelWear
  };
}

export const TyreDegradationGauge: React.FC<Props> = ({
  entry,
  completedLaps,
  trackTemp = 35,
  circuitName,
  className = '',
  compact = false
}) => {
  const analysis = useMemo(
    () => calculateTyreWear(entry, completedLaps, trackTemp),
    [entry, completedLaps, trackTemp]
  );

  // SVG circular gauge geometry
  const radius = compact ? 38 : 46;
  const strokeWidth = compact ? 7 : 8;
  const circumference = 2 * Math.PI * radius;
  // Semicircle / 270-degree arc: let's use a 260-degree open gauge for high-tech motorsport telemetry feel
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * analysis.percentageRemaining) / 100;

  return (
    <div
      className={`f1-tyre-degradation-gauge bg-[#0e1116] border border-[#232a35] rounded-xl p-3 sm:p-4 font-mono text-xs ${className}`}
      aria-label={`Tyre degradation gauge for ${entry.driverName}: ${analysis.percentageRemaining}% life remaining`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#212733] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-neutral-400" />
          <span className="font-bold text-white text-[11px] sm:text-xs tracking-wider uppercase">
            TYRE DEGRADATION & LIFE REMAINING
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${analysis.statusColor}22`,
              color: analysis.statusColor,
              border: `1px solid ${analysis.statusColor}55`
            }}
          >
            {analysis.status}
          </span>
        </div>
      </div>

      {/* Main Gauge & Primary Data Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Circular Dial Meter */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-135"
              viewBox="0 0 120 120"
            >
              {/* Background meter track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#1f2632"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Active remaining life arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={analysis.statusColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${analysis.statusColor}66)`
                }}
              />
            </svg>

            {/* Center Dial Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pt-1">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none timing-cell">
                {analysis.percentageRemaining}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold mt-1">
                LIFE REMAINING
              </span>
              <div
                className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                style={{
                  backgroundColor: `${analysis.compoundColor}20`,
                  color: analysis.compoundColor,
                  border: `1px solid ${analysis.compoundBorderColor}66`
                }}
              >
                <span>{analysis.compound}</span>
                <span className="text-neutral-400 font-normal">· {analysis.lapsUsed}L</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 mt-2 text-center">
            {analysis.lapsRemaining > 0 ? (
              <span>Estimated <strong>~{analysis.lapsRemaining} laps</strong> before performance cliff</span>
            ) : (
              <span className="text-red-400 font-bold flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Performance cliff reached
              </span>
            )}
          </div>
        </div>

        {/* Right: Detailed Telemetry Cards */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
          {/* Metrics Row 1 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-[#1f2632] bg-[#141820] p-2.5 rounded-lg">
              <div className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                STINT USAGE
              </div>
              <div className="mt-1 text-base font-bold text-white timing-cell">
                {analysis.lapsUsed} <span className="text-xs font-normal text-neutral-400">/ {analysis.effectiveMaxLaps} LAPS</span>
              </div>
              <div className="w-full bg-[#202735] h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (analysis.lapsUsed / analysis.effectiveMaxLaps) * 100)}%`,
                    backgroundColor: analysis.compoundColor
                  }}
                />
              </div>
            </div>

            <div className="border border-[#1f2632] bg-[#141820] p-2.5 rounded-lg">
              <div className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                WEAR DEFICIT
              </div>
              <div className="mt-1 text-base font-bold text-white timing-cell">
                +{analysis.paceLossSeconds.toFixed(2)}s
                <span className="text-[10px] font-normal text-neutral-400 ml-1">/ LAP PACE</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-1.5 truncate">
                Rate: +{analysis.degRateSecondsPerLap.toFixed(3)}s / lap
              </div>
            </div>
          </div>

          {/* 4-Wheel Tread Wear Layout */}
          <div className="border border-[#1f2632] bg-[#141820] p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold mb-2">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-purple-400" /> CORNER TREAD LIFE
              </span>
              <span className="text-[9px] text-neutral-500">CAR #{entry.driverNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              {/* Front Left */}
              <div className="flex items-center justify-between border-b border-[#1f2734] pb-1">
                <span className="text-neutral-400">FL (Front Left)</span>
                <span className="font-bold timing-cell" style={{ color: analysis.wheelWear.fl < 20 ? '#ef4444' : '#f8fafc' }}>
                  {analysis.wheelWear.fl}%
                </span>
              </div>
              {/* Front Right */}
              <div className="flex items-center justify-between border-b border-[#1f2734] pb-1">
                <span className="text-neutral-400">FR (Front Right)</span>
                <span className="font-bold timing-cell" style={{ color: analysis.wheelWear.fr < 20 ? '#ef4444' : '#f8fafc' }}>
                  {analysis.wheelWear.fr}%
                </span>
              </div>
              {/* Rear Left */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">RL (Rear Left)</span>
                <span className="font-bold timing-cell" style={{ color: analysis.wheelWear.rl < 20 ? '#ef4444' : '#f8fafc' }}>
                  {analysis.wheelWear.rl}%
                </span>
              </div>
              {/* Rear Right */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">RR (Rear Right)</span>
                <span className="font-bold timing-cell" style={{ color: analysis.wheelWear.rr < 20 ? '#ef4444' : '#f8fafc' }}>
                  {analysis.wheelWear.rr}%
                </span>
              </div>
            </div>
          </div>

          {/* Strategic Context Footer */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-neutral-400 pt-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              Thermal Stress: <strong className="text-white">{analysis.thermalFactor > 1.0 ? `+${Math.round((analysis.thermalFactor - 1) * 100)}% (Track ${trackTemp.toFixed(1)}°C)` : 'Normal'}</strong>
            </span>
            <span className="text-neutral-500 truncate max-w-[220px]">
              {analysis.telemetryTrendText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
