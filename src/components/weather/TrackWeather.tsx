import React, { useState, useMemo } from 'react';
import { LiveSessionSnapshot } from '../../types/f1';
import {
  Thermometer,
  CloudRain,
  Droplets,
  Wind,
  Gauge,
  Sun,
  Flame,
  Umbrella,
  Compass,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info
} from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Extracts or calculates rainfall probability from snapshot data.
 * Priority:
 * 1. Active rainfall boolean (if true -> 100%)
 * 2. Explicit snapshot.weather.rainfallProbability
 * 3. Race control messages broadcasting "RISK OF RAIN ... X%"
 * 4. Meteorological calculation based on humidity and barometric pressure
 */
export function deriveRainfallProbability(snapshot: LiveSessionSnapshot): {
  probability: number;
  source: 'ACTIVE_RAIN' | 'TELEMETRY' | 'RACE_CONTROL' | 'METEOROLOGICAL_MODEL' | 'UNAVAILABLE';
  riskLevel: 'DRY' | 'LOW' | 'MODERATE' | 'HIGH' | 'WET';
  forecastNote?: string;
} {
  const { weather, raceControl = [] } = snapshot;

  // 1. Active rain detection
  if (weather.rainfall) {
    return {
      probability: 100,
      source: 'ACTIVE_RAIN',
      riskLevel: 'WET',
      forecastNote: 'Active precipitation detected on circuit'
    };
  }

  // 2. Explicit probability in weather telemetry
  if (weather.rainfallProbability !== undefined && Number.isFinite(weather.rainfallProbability)) {
    const prob = Math.max(0, Math.min(100, Math.round(weather.rainfallProbability)));
    const riskLevel = prob >= 70 ? 'HIGH' : prob >= 40 ? 'MODERATE' : prob >= 15 ? 'LOW' : 'DRY';
    return {
      probability: prob,
      source: 'TELEMETRY',
      riskLevel,
      forecastNote: prob > 0 ? `${prob}% probability of rain` : 'No rain expected'
    };
  }

  // 3. Scan recent race control messages for FIA rain risk announcements
  for (let i = raceControl.length - 1; i >= 0; i--) {
    const msg = raceControl[i].message || '';
    const match = msg.match(/RISK OF RAIN.*?(\d+)\s*%/i) || msg.match(/RAIN RISK.*?(\d+)\s*%/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) {
        const prob = Math.max(0, Math.min(100, parsed));
        const riskLevel = prob >= 70 ? 'HIGH' : prob >= 40 ? 'MODERATE' : prob >= 15 ? 'LOW' : 'DRY';
        return {
          probability: prob,
          source: 'RACE_CONTROL',
          riskLevel,
          forecastNote: `Official FIA radar: ${prob}% risk`
        };
      }
    }
    if (/RAIN REPORTED|TRACK IS WET|RAIN ON TRACK/i.test(msg)) {
      return {
        probability: 90,
        source: 'RACE_CONTROL',
        riskLevel: 'WET',
        forecastNote: 'Rain reported on track by race control'
      };
    }
  }

  // 4. Meteorological estimation based on ambient humidity and pressure
  if (weather.airTemp > 0 && weather.humidity > 0) {
    let baseProb = 0;
    const h = weather.humidity;
    if (h >= 90) baseProb = 75;
    else if (h >= 80) baseProb = 50;
    else if (h >= 70) baseProb = 30;
    else if (h >= 60) baseProb = 15;
    else if (h >= 50) baseProb = 5;
    else baseProb = 0;

    // Atmospheric pressure adjustment: standard sea-level is ~1013.25 mbar
    if (weather.pressure > 0 && weather.pressure < 1005) {
      baseProb = Math.min(100, baseProb + 10); // Low pressure increases precipitation likelihood
    }

    const prob = Math.min(100, Math.max(0, Math.round(baseProb)));
    const riskLevel = prob >= 70 ? 'HIGH' : prob >= 40 ? 'MODERATE' : prob >= 15 ? 'LOW' : 'DRY';
    return {
      probability: prob,
      source: 'METEOROLOGICAL_MODEL',
      riskLevel,
      forecastNote: prob > 0 ? `Estimated ${prob}% from ambient conditions` : 'Dry conditions prevailing'
    };
  }

  return {
    probability: 0,
    source: 'UNAVAILABLE',
    riskLevel: 'DRY',
    forecastNote: 'Awaiting circuit meteorological sensors'
  };
}

/**
 * Returns cardinal direction from wind azimuth degrees.
 */
function getWindCompass(degrees: number): string {
  if (!Number.isFinite(degrees) || degrees < 0) return '—';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return directions[index];
}

export const TrackWeather: React.FC<Props> = ({ snapshot, className = '', defaultExpanded = false }) => {
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { weather } = snapshot;
  const rainInfo = useMemo(() => deriveRainfallProbability(snapshot), [snapshot]);

  const toDisplayTemp = (celsius: number): string => {
    if (!celsius && celsius !== 0) return '—';
    if (useFahrenheit) {
      return ((celsius * 9) / 5 + 32).toFixed(1) + '°F';
    }
    return celsius.toFixed(1) + '°C';
  };

  const trackDelta = weather.trackTemp > 0 && weather.airTemp > 0
    ? (weather.trackTemp - weather.airTemp).toFixed(1)
    : null;

  const trackDeltaF = weather.trackTemp > 0 && weather.airTemp > 0
    ? (((weather.trackTemp - weather.airTemp) * 9) / 5).toFixed(1)
    : null;

  // Track conditions classification
  const trackCondition = weather.rainfall
    ? { label: 'WET TRACK', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40', badge: 'WET', tyreHint: 'INTER / WET TYRES' }
    : rainInfo.probability >= 60
    ? { label: 'RAIN RISK', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40', badge: 'HIGH RISK', tyreHint: 'MONITOR RADAR' }
    : rainInfo.probability >= 25
    ? { label: 'DAMP / CHANGEABLE', color: 'text-yellow-300 bg-yellow-950/40 border-yellow-500/30', badge: 'RISK', tyreHint: 'SLICKS (DRY)' }
    : weather.trackTemp > 45
    ? { label: 'HOT ASPHALT', color: 'text-orange-400 bg-orange-950/40 border-orange-500/30', badge: 'HIGH DEGRADATION', tyreHint: 'THERMAL DEGRADATION' }
    : { label: 'OPTIMAL DRY', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30', badge: 'DRY', tyreHint: 'SLICKS OPTIMAL' };

  return (
    <section
      aria-label="Circuit Track Weather Telemetry"
      className={`f1-track-weather bg-[#0e0e12] border border-[#23232b] rounded-xl overflow-hidden shadow-xl transition-all duration-200 ${className}`}
    >
      {/* Header bar: Title, circuit, unit toggle, expand toggle */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#14141a] border-b border-[#23232b]">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
          <div className="flex items-baseline gap-2 truncate">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-white uppercase">
              TRACK WEATHER
            </span>
            <span className="text-[11px] font-mono text-[#8d8d96] truncate hidden xs:inline">
              {snapshot.circuitName || 'CIRCUIT TIMING'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Track Condition Status Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${trackCondition.color}`}
          >
            {weather.rainfall ? (
              <CloudRain className="w-3 h-3 animate-bounce" />
            ) : rainInfo.probability > 30 ? (
              <Umbrella className="w-3 h-3" />
            ) : (
              <Sun className="w-3 h-3 text-emerald-400" />
            )}
            <span className="hidden sm:inline">{trackCondition.label}</span>
            <span className="sm:hidden">{trackCondition.badge}</span>
          </span>

          {/* Unit Toggle: °C / °F */}
          <button
            type="button"
            onClick={() => setUseFahrenheit(!useFahrenheit)}
            className="px-2 py-1 rounded bg-[#1a1a22] hover:bg-[#252530] text-[#a0a0ab] hover:text-white border border-[#2d2d38] text-[10px] font-mono tracking-wider transition-colors active:scale-95"
            title="Toggle Temperature Units"
            aria-label={`Toggle temperature unit (currently ${useFahrenheit ? 'Fahrenheit' : 'Celsius'})`}
          >
            {useFahrenheit ? '°F' : '°C'}
          </button>

          {/* Mobile expandable drawer toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 sm:px-2 sm:py-1 rounded bg-[#1a1a22] hover:bg-[#252530] text-[#8d8d96] hover:text-white border border-[#2d2d38] text-[10px] font-mono flex items-center gap-1 transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse weather telemetry' : 'Expand weather telemetry'}
          >
            <span className="hidden sm:inline">{isExpanded ? 'LESS' : 'DETAILS'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary 4-Metric Grid: Responsive 2x2 on mobile, 4-col on tablet/desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#23232b] bg-[#0e0e12]">
        {/* 1. AIR TEMPERATURE */}
        <div className="p-3 sm:p-4 flex flex-col justify-between hover:bg-[#131319] transition-colors">
          <div className="flex items-center justify-between text-[#8d8d96] mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-blue-400" />
              AIR TEMP
            </span>
            <span className="text-[9px] font-mono text-[#5e5e68]">AMBIENT</span>
          </div>
          <div className="my-1">
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {weather.airTemp > 0 ? toDisplayTemp(weather.airTemp) : '—'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#8d8d96] flex items-center justify-between pt-1 border-t border-[#1b1b22]">
            <span>STATUS</span>
            <span className="text-white">
              {weather.airTemp <= 0
                ? 'STANDBY'
                : weather.airTemp > 32
                ? 'VERY WARM'
                : weather.airTemp > 24
                ? 'WARM'
                : weather.airTemp > 16
                ? 'MODERATE'
                : 'COOL'}
            </span>
          </div>
        </div>

        {/* 2. TRACK TEMPERATURE */}
        <div className="p-3 sm:p-4 flex flex-col justify-between hover:bg-[#131319] transition-colors">
          <div className="flex items-center justify-between text-[#8d8d96] mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              TRACK TEMP
            </span>
            {trackDelta && (
              <span className="text-[9px] font-mono text-amber-400 font-semibold">
                +{useFahrenheit ? `${trackDeltaF}°F` : `${trackDelta}°C`} Δ
              </span>
            )}
          </div>
          <div className="my-1">
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {weather.trackTemp > 0 ? toDisplayTemp(weather.trackTemp) : '—'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#8d8d96] flex items-center justify-between pt-1 border-t border-[#1b1b22]">
            <span>SURFACE</span>
            <span
              className={
                weather.trackTemp > 45
                  ? 'text-red-400 font-semibold'
                  : weather.trackTemp > 35
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }
            >
              {weather.trackTemp <= 0
                ? 'STANDBY'
                : weather.trackTemp > 45
                ? 'HOT / HIGH DEG'
                : weather.trackTemp > 32
                ? 'WARM'
                : 'MILD'}
            </span>
          </div>
        </div>

        {/* 3. HUMIDITY */}
        <div className="p-3 sm:p-4 flex flex-col justify-between hover:bg-[#131319] transition-colors border-t lg:border-t-0">
          <div className="flex items-center justify-between text-[#8d8d96] mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              HUMIDITY
            </span>
            <span className="text-[9px] font-mono text-[#5e5e68]">REL %</span>
          </div>
          <div className="my-1">
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {weather.humidity > 0 ? `${weather.humidity.toFixed(0)}%` : '—'}
            </div>
          </div>
          {/* Mini visual humidity gauge */}
          <div className="pt-1 border-t border-[#1b1b22]">
            <div className="w-full bg-[#1c1c24] h-1.5 rounded-full overflow-hidden mb-1">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, weather.humidity))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#5e5e68]">
              <span>DRY</span>
              <span className="text-[#8d8d96]">{weather.humidity > 70 ? 'DAMP AIR' : 'OPTIMAL'}</span>
              <span>HUMID</span>
            </div>
          </div>
        </div>

        {/* 4. RAINFALL PROBABILITY */}
        <div className="p-3 sm:p-4 flex flex-col justify-between hover:bg-[#131319] transition-colors border-t lg:border-t-0">
          <div className="flex items-center justify-between text-[#8d8d96] mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <CloudRain className={`w-3.5 h-3.5 ${weather.rainfall ? 'text-cyan-400 animate-bounce' : rainInfo.probability > 40 ? 'text-amber-400' : 'text-emerald-400'}`} />
              RAIN PROB
            </span>
            <span
              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                weather.rainfall
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : rainInfo.probability >= 50
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {weather.rainfall ? 'WET' : `${rainInfo.riskLevel} RISK`}
            </span>
          </div>
          <div className="my-1 flex items-baseline justify-between">
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {weather.rainfall ? '100%' : `${rainInfo.probability}%`}
            </div>
            {weather.rainfall && (
              <span className="text-[10px] font-mono font-bold text-cyan-400 animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          {/* Mini rainfall probability bar */}
          <div className="pt-1 border-t border-[#1b1b22]">
            <div className="w-full bg-[#1c1c24] h-1.5 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  weather.rainfall
                    ? 'bg-cyan-400'
                    : rainInfo.probability >= 60
                    ? 'bg-amber-400'
                    : rainInfo.probability >= 30
                    ? 'bg-yellow-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${weather.rainfall ? 100 : Math.min(100, Math.max(2, rainInfo.probability))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#5e5e68]">
              <span>0% (DRY)</span>
              <span className="text-[#8d8d96] truncate max-w-[120px]">
                {weather.rainfall ? 'RAIN FALLING' : rainInfo.riskLevel === 'DRY' ? 'NO PRECIP' : 'RADAR ALERT'}
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details Drawer: Wind, Pressure, Tyre Impact & Radar Forecast (Collapsible on mobile, toggleable) */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-[#0a0a0d] border-t border-[#23232b] text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Wind Telemetry */}
            <div className="bg-[#121217] p-2.5 rounded-lg border border-[#1f1f26]">
              <div className="flex items-center justify-between text-[#8d8d96] text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Wind className="w-3 h-3 text-cyan-400" /> WIND TELEMETRY
                </span>
                <span>{getWindCompass(weather.windDirection)}</span>
              </div>
              <div className="font-mono text-base font-bold text-white mt-1">
                {weather.windSpeed > 0 ? `${(weather.windSpeed * 3.6).toFixed(1)} km/h` : 'CALM'}
                <span className="text-[10px] text-[#8d8d96] ml-1.5 font-normal">
                  ({weather.windSpeed > 0 ? `${weather.windSpeed.toFixed(1)} m/s` : '0 m/s'})
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-[#8d8d96]">
                <Compass className="w-3 h-3 text-[#5e5e68]" />
                <span>HEADING: {weather.windDirection > 0 ? `${Math.round(weather.windDirection)}°` : 'VARIABLE'}</span>
              </div>
            </div>

            {/* Pressure Telemetry */}
            <div className="bg-[#121217] p-2.5 rounded-lg border border-[#1f1f26]">
              <div className="flex items-center justify-between text-[#8d8d96] text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Gauge className="w-3 h-3 text-purple-400" /> BAROMETRIC
                </span>
                <span className="text-[9px]">QNH</span>
              </div>
              <div className="font-mono text-base font-bold text-white mt-1">
                {weather.pressure > 0 ? `${weather.pressure.toFixed(1)} hPa` : '1013.0 hPa'}
              </div>
              <div className="mt-1.5 text-[10px] font-mono text-[#8d8d96]">
                {weather.pressure < 1005 ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> LOW PRESSURE SYSTEM
                  </span>
                ) : (
                  <span className="text-emerald-400">STABLE ATMOSPHERE</span>
                )}
              </div>
            </div>

            {/* Tyre Strategy Advisory */}
            <div className="bg-[#121217] p-2.5 rounded-lg border border-[#1f1f26]">
              <div className="flex items-center justify-between text-[#8d8d96] text-[10px] font-mono mb-1">
                <span className="font-semibold text-white">TYRE ADVISORY</span>
                <span className="text-[9px] text-[#5e5e68]">STRATEGY</span>
              </div>
              <div className="font-mono text-sm font-bold text-white mt-1 truncate">
                {trackCondition.tyreHint}
              </div>
              <div className="mt-1.5 text-[10px] font-mono text-[#8d8d96]">
                {weather.rainfall
                  ? 'Full wet / Intermediate tyres mandatory'
                  : weather.trackTemp > 45
                  ? 'High degradation on soft compound'
                  : 'Normal slick compound operating window'}
              </div>
            </div>

            {/* Weather Radar Advisory */}
            <div className="bg-[#121217] p-2.5 rounded-lg border border-[#1f1f26]">
              <div className="flex items-center justify-between text-[#8d8d96] text-[10px] font-mono mb-1">
                <span className="font-semibold text-white">MET FORECAST</span>
                <span className="text-[9px] text-[#5e5e68] flex items-center gap-0.5">
                  <Info className="w-2.5 h-2.5" /> {rainInfo.source}
                </span>
              </div>
              <div className="font-mono text-sm font-semibold text-white mt-1">
                {rainInfo.forecastNote || 'Standard dry track'}
              </div>
              <div className="mt-1.5 text-[10px] font-mono text-[#5e5e68] truncate">
                SYNCED: {snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleTimeString() : 'LIVE'}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
