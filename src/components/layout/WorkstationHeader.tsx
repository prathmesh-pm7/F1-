import React, { useState } from 'react';
import { LiveSessionSnapshot, LiveConnectionState } from '../../types/f1';
import { Search, CloudRain, Sun, X, Droplets } from 'lucide-react';
import { TrackWeather, deriveRainfallProbability } from '../weather/TrackWeather';

interface Props {
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  onOpenSearch: () => void;
  onToggleProviderMode: () => void;
  isReplayMode: boolean;
}

export const WorkstationHeader: React.FC<Props> = ({ snapshot, connectionState, onOpenSearch, onToggleProviderMode, isReplayMode }) => {
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);

  const stateLabel = connectionState === 'LIVE'
    ? 'LIVE'
    : connectionState === 'REPLAY'
      ? 'REPLAY'
      : connectionState === 'STALE'
        ? 'STALE'
        : connectionState === 'PROVIDER_UNAVAILABLE'
          ? 'PROVIDER UNAVAILABLE'
          : connectionState === 'DISCONNECTED'
            ? 'NO LIVE SESSION'
            : connectionState;

  const rainInfo = deriveRainfallProbability(snapshot);

  return (
    <>
      <header className="f1-header">
        <div className="f1-header-context">
          <div className="f1-context-primary">
            <span className="f1-red-rule" />
            <span>{snapshot.sessionName || 'FORMULA 1'}</span>
            <span className="f1-sep">/</span>
            <span className="muted">{snapshot.circuitName || 'CIRCUIT —'}</span>
          </div>
          <div className="f1-context-meta">
            <span className="f1-context-lap">{snapshot.currentLap > 0 ? `LAP ${snapshot.currentLap}/${snapshot.totalLaps || '—'}` : 'SESSION —'}</span>
            <span aria-live="polite" className={`f1-state f1-state-${connectionState.toLowerCase()}`}><i />{stateLabel}</span>
            <button type="button" className="f1-search-button" onClick={onOpenSearch}><Search className="w-3.5 h-3.5" /><span>SEARCH</span><kbd>⌘K</kbd></button>
          </div>
        </div>
        <div className="f1-header-rule">
          <div className="f1-header-source">
            <span className="muted">{isReplayMode ? 'RECORDED REPLAY' : 'TIMING WORKSTATION'}</span>
          </div>
          <div className="f1-header-actions">
            {/* Clickable interactive weather bar */}
            <button
              type="button"
              onClick={() => setIsWeatherModalOpen(true)}
              className="f1-weather hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#1a1a20]"
              title="Click to view detailed Track Weather"
              aria-label="View Circuit Track Weather Telemetry"
            >
              {snapshot.weather.rainfall ? (
                <CloudRain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              ) : rainInfo.probability > 30 ? (
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{snapshot.weather.airTemp > 0 ? `AIR ${snapshot.weather.airTemp.toFixed(1)}°` : 'AIR —'}</span>
              <span>/</span>
              <span>{snapshot.weather.trackTemp > 0 ? `TRACK ${snapshot.weather.trackTemp.toFixed(1)}°` : 'TRACK —'}</span>
              <span>/</span>
              <span>{snapshot.weather.humidity > 0 ? `${snapshot.weather.humidity.toFixed(0)}%` : 'HUM —'}</span>
              <span>/</span>
              <span className={snapshot.weather.rainfall ? 'text-cyan-400 font-bold' : rainInfo.probability > 30 ? 'text-amber-400' : 'text-[#8d8d96]'}>
                {snapshot.weather.rainfall ? 'RAIN' : `RAIN ${rainInfo.probability}%`}
              </span>
            </button>

            <button type="button" className="f1-mode-button" onClick={onToggleProviderMode}>
              {isReplayMode ? 'LIVE FEED' : 'REPLAY'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile-Friendly Track Weather Modal Dialog */}
      {isWeatherModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Circuit Track Weather Telemetry"
          onClick={() => setIsWeatherModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#0e0e12] border border-[#2d2d38] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#14141c] border-b border-[#23232b]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <h2 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-white uppercase">
                  CIRCUIT METEOROLOGICAL TELEMETRY
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsWeatherModalOpen(false)}
                className="p-1 rounded text-[#8d8d96] hover:text-white hover:bg-[#252530] transition-colors"
                aria-label="Close Weather Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 sm:p-5 overflow-y-auto">
              <TrackWeather snapshot={snapshot} defaultExpanded={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
