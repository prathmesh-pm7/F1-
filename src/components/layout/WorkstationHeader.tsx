import React, { useState, useEffect } from 'react';
import { LiveSessionSnapshot, LiveConnectionState } from '../../types/f1';
import { LiveStatusIndicator } from '../shared/LiveStatusIndicator';
import { Thermometer, CloudRain, Wind, Search, Radio, PlayCircle } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  onOpenSearch: () => void;
  onToggleProviderMode: () => void;
  isReplayMode: boolean;
}

export const WorkstationHeader: React.FC<Props> = ({
  snapshot,
  connectionState,
  onOpenSearch,
  onToggleProviderMode,
  isReplayMode
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#242c37] bg-[#0d1014] text-neutral-300">
      {/* Top telemetry context bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1c222b] text-xs font-mono">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 font-bold text-white shrink-0">
            <span className="w-2 h-3.5 bg-[#e10600] inline-block"></span>
            <span className="tracking-wider uppercase">{snapshot.sessionName}</span>
          </div>

          <span className="text-[#333d4d]" aria-hidden="true">/</span>

          <span className="text-neutral-400 shrink-0 font-medium">{snapshot.circuitName}</span>

          <span className="text-[#333d4d] hidden sm:inline" aria-hidden="true">/</span>

          <span className="text-white font-bold bg-[#1a2028] px-2 py-0.5 border border-[#2b3543] shrink-0">
            {snapshot.remainingTimeStr || `LAP ${snapshot.currentLap}/${snapshot.totalLaps}`}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Weather status */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1" title="Air Temperature">
              <Thermometer className="w-3 h-3 text-sky-400" />
              <span>AIR {snapshot.weather.airTemp}°C</span>
            </span>
            <span className="flex items-center gap-1" title="Track Temperature">
              <Thermometer className="w-3 h-3 text-amber-500" />
              <span>TRK {snapshot.weather.trackTemp}°C</span>
            </span>
            <span className="flex items-center gap-1" title="Wind">
              <Wind className="w-3 h-3 text-neutral-400" />
              <span>{snapshot.weather.windSpeed}m/s</span>
            </span>
            <span className="flex items-center gap-1">
              <CloudRain className={`w-3 h-3 ${snapshot.weather.rainfall ? 'text-blue-400' : 'text-neutral-600'}`} />
              <span className={snapshot.weather.rainfall ? 'text-blue-400 font-bold' : ''}>
                {snapshot.weather.rainfall ? 'RAIN' : 'DRY'}
              </span>
            </span>
          </div>

          <span className="text-[#333d4d] hidden lg:inline" aria-hidden="true">|</span>

          {/* UTC Clock */}
          <span className="hidden sm:inline font-mono text-[11px] text-neutral-400">
            {utcTime}
          </span>
        </div>
      </div>

      {/* Primary workstation bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#111418]">
        <div className="flex items-center gap-3">
          <LiveStatusIndicator state={connectionState} />

          {connectionState === 'REPLAY' && (
            <span className="text-[11px] font-mono text-amber-400/90 hidden sm:inline">
              · Monza 2024 GP Recorded Telemetry
            </span>
          )}

          {connectionState === 'PROVIDER_UNAVAILABLE' && (
            <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
              · No on-track session live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Dual Segment Provider Selector */}
          <div className="flex items-center border border-[#2d3744] bg-[#0c0f13] text-xs font-mono p-0.5">
            <button
              type="button"
              onClick={() => { if (isReplayMode) onToggleProviderMode(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold transition-colors ${
                !isReplayMode
                  ? 'bg-[#1a2330] text-emerald-400 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Formula 1 Live SignalR Feed"
            >
              <Radio className="w-3 h-3" />
              <span>LIVE FEED</span>
            </button>
            <button
              type="button"
              onClick={() => { if (!isReplayMode) onToggleProviderMode(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold transition-colors ${
                isReplayMode
                  ? 'bg-[#292212] text-amber-300 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Verified Replay of 2024 Italian GP at Monza"
            >
              <PlayCircle className="w-3 h-3" />
              <span>MONZA REPLAY</span>
            </button>
          </div>

          {/* Quick search button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono bg-[#161a20] border border-[#2d3744] text-neutral-400 hover:text-neutral-200 hover:border-neutral-400 transition-colors"
            title="Search (Cmd + K)"
          >
            <Search className="w-3 h-3" />
            <span className="hidden md:inline">SEARCH</span>
            <kbd className="hidden sm:inline px-1 py-0.2 text-[10px] bg-[#222933] text-neutral-300 border border-[#333d4d]">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
