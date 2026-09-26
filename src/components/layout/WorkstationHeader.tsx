import React from 'react';
import { LiveSessionSnapshot, LiveConnectionState } from '../../types/f1';
import { LiveStatusIndicator } from '../shared/LiveStatusIndicator';
import { Search } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  onOpenSearch: () => void;
  onToggleProviderMode: () => void;
  isReplayMode: boolean;
}

export const WorkstationHeader: React.FC<Props> = ({ snapshot, connectionState, onOpenSearch, onToggleProviderMode, isReplayMode }) => {
  const stateLabel = connectionState === 'LIVE' ? 'LIVE' : connectionState === 'REPLAY' ? 'REPLAY' : connectionState === 'STALE' ? 'STALE' : connectionState === 'PROVIDER_UNAVAILABLE' ? 'UNAVAILABLE' : connectionState;
  return (
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
          <span className={`f1-state f1-state-${connectionState.toLowerCase()}`}><i />{stateLabel}</span>
          <button type="button" className="f1-search-button" onClick={onOpenSearch}><Search className="w-3.5 h-3.5" /><span>SEARCH</span><kbd>⌘K</kbd></button>
        </div>
      </div>
      <div className="f1-header-rule">
        <div className="f1-header-source">
          <LiveStatusIndicator state={connectionState} />
          <span className="muted">{isReplayMode ? 'RECORDED REPLAY' : 'LIVE CONNECTION'}</span>
        </div>
        <div className="f1-header-actions">
          <span className="f1-weather">{snapshot.weather.airTemp > 0 ? `AIR ${snapshot.weather.airTemp}°` : 'AIR —'} <span>/</span> {snapshot.weather.trackTemp > 0 ? `TRACK ${snapshot.weather.trackTemp}°` : 'TRACK —'}</span>
          <button type="button" className="f1-mode-button" onClick={onToggleProviderMode}>{isReplayMode ? 'LIVE FEED' : 'REPLAY'}</button>
        </div>
      </div>
    </header>
  );
};
