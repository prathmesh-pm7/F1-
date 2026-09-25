import React from 'react';
import { WifiOff, AlertTriangle, Clock, Layers } from 'lucide-react';

interface Props {
  type?: 'live-unavailable' | 'no-data' | 'stale' | 'not-found';
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<Props> = ({
  type = 'live-unavailable',
  title,
  message,
  actionText,
  onAction,
  className = ''
}) => {
  const getDefaults = () => {
    switch (type) {
      case 'live-unavailable':
        return {
          icon: WifiOff,
          title: 'LIVE DATA UNAVAILABLE',
          message: 'No live Formula 1 track session is actively transmitting timing telemetry right now. Start Replay mode to explore verified real-world session data.',
          action: 'LOAD MONZA 2024 RACE REPLAY'
        };
      case 'no-data':
        return {
          icon: Clock,
          title: 'SESSION HAS NOT STARTED',
          message: 'Telemetry and timing data will become available once cars leave the pit lane for the reconnaissance lap.',
          action: undefined
        };
      case 'stale':
        return {
          icon: AlertTriangle,
          title: 'STALE PROVIDER STREAM',
          message: 'Heartbeat packets from the live timing server have paused. Reconnecting to the track telemetry link.',
          action: 'RETRY CONNECTION'
        };
      default:
        return {
          icon: Layers,
          title: 'NO RECORDS FOUND',
          message: 'No matching timing or telemetry entries match your current search or filter query.',
          action: undefined
        };
    }
  };

  const defaults = getDefaults();
  const Icon = defaults.icon;
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;
  const displayAction = actionText || defaults.action;

  return (
    <div className={`p-8 border border-[#242c37] bg-[#111418] text-center max-w-lg mx-auto ${className}`}>
      <div className="inline-flex items-center justify-center w-10 h-10 border border-[#2d3744] bg-[#161a20] text-neutral-400 mb-4">
        <Icon className="w-5 h-5 text-neutral-300" />
      </div>

      <h3 className="font-mono text-sm font-bold tracking-wider text-neutral-200 uppercase mb-2">
        {displayTitle}
      </h3>

      <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
        {displayMessage}
      </p>

      {displayAction && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-mono font-medium tracking-wide uppercase bg-[#1c222b] text-neutral-200 border border-[#333d4d] hover:bg-[#252c38] hover:border-neutral-400 transition-colors"
        >
          {displayAction}
        </button>
      )}
    </div>
  );
};
