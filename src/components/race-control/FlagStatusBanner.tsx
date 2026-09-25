import React from 'react';
import { TrackStatus } from '../../types/f1';
import { AlertOctagon, Flag, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  trackStatus: TrackStatus;
  className?: string;
}

export const FlagStatusBanner: React.FC<Props> = ({ trackStatus, className = '' }) => {
  // F1 Status: 1 = Clear, 2 = Yellow, 4 = SC, 5 = Red Flag, 6 = VSC, 7 = VSC Ending
  const getBannerConfig = () => {
    switch (trackStatus.status) {
      case '5':
        return {
          bg: 'bg-red-950/80 border-red-600 text-red-200',
          indicator: 'bg-red-600 animate-pulse',
          icon: AlertOctagon,
          title: 'RED FLAG',
          sub: 'SESSION SUSPENDED — CARS RETURNING TO PIT LANE'
        };
      case '4':
        return {
          bg: 'bg-amber-950/80 border-amber-500 text-amber-200',
          indicator: 'bg-amber-500 animate-pulse',
          icon: ShieldAlert,
          title: 'SAFETY CAR',
          sub: 'SAFETY CAR DEPLOYED — DELTA TIME ENFORCED'
        };
      case '6':
        return {
          bg: 'bg-amber-950/70 border-amber-400 text-amber-200',
          indicator: 'bg-amber-400 animate-pulse',
          icon: ShieldAlert,
          title: 'VIRTUAL SAFETY CAR',
          sub: 'VSC DEPLOYED — MAINTAIN POSITIVE DELTA'
        };
      case '2':
        return {
          bg: 'bg-yellow-950/70 border-yellow-500 text-yellow-200',
          indicator: 'bg-yellow-500 animate-pulse',
          icon: Flag,
          title: 'YELLOW FLAG',
          sub: 'HAZARD ON TRACK — REDUCE SPEED, NO OVERTAKING'
        };
      case '1':
      default:
        return {
          bg: 'bg-[#121915] border-emerald-800/80 text-emerald-300',
          indicator: 'bg-emerald-500',
          icon: CheckCircle2,
          title: 'TRACK CLEAR',
          sub: 'NORMAL RACING CONDITIONS'
        };
    }
  };

  const config = getBannerConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-between px-3 py-1.5 border font-mono text-xs ${config.bg} ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.indicator}`}></span>
        <Icon className="w-3.5 h-3.5" />
        <span className="font-bold tracking-wider">{config.title}</span>
        <span className="text-neutral-500" aria-hidden="true">|</span>
        <span className="text-[11px] opacity-90 hidden sm:inline">{config.sub}</span>
      </div>
      <span className="text-[10px] text-neutral-400">
        UPDATED {trackStatus.updatedAt}
      </span>
    </div>
  );
};
