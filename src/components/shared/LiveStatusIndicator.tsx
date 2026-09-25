import React from 'react';
import { LiveConnectionState } from '../../types/f1';
import { Radio, AlertCircle, RefreshCw, Database, PlayCircle, WifiOff } from 'lucide-react';

interface Props {
  state: LiveConnectionState;
  showText?: boolean;
  className?: string;
}

export const LiveStatusIndicator: React.FC<Props> = ({ state, showText = true, className = '' }) => {
  switch (state) {
    case 'LIVE':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400 ${className}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {showText && <span>LIVE TIMING</span>}
        </div>
      );

    case 'REPLAY':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-amber-400 ${className}`}>
          <PlayCircle className="w-3.5 h-3.5" />
          {showText && <span>REPLAY SESSION</span>}
        </div>
      );

    case 'CONNECTING':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-sky-400 ${className}`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {showText && <span>CONNECTING...</span>}
        </div>
      );

    case 'STALE':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-amber-500/80 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {showText && <span>STALE DATA</span>}
        </div>
      );

    case 'PROVIDER_UNAVAILABLE':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-neutral-400 ${className}`}>
          <WifiOff className="w-3.5 h-3.5 text-neutral-500" />
          {showText && <span>LIVE UNAVAILABLE</span>}
        </div>
      );

    case 'FIXTURE':
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-purple-400 ${className}`}>
          <Database className="w-3.5 h-3.5" />
          {showText && <span>FIXTURE DATA</span>}
        </div>
      );

    case 'DISCONNECTED':
    default:
      return (
        <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 ${className}`}>
          <span className="inline-block h-2 w-2 rounded-full bg-neutral-600"></span>
          {showText && <span>DISCONNECTED</span>}
        </div>
      );
  }
};
