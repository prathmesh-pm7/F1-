import React from 'react';
import { TrackStatus } from '../../types/f1';

interface Props {
  trackStatus: TrackStatus;
  className?: string;
}

export const FlagStatusBanner: React.FC<Props> = ({ trackStatus, className = '' }) => {
  const config = (() => {
    switch (trackStatus.status) {
      case '5': return { title: 'RED FLAG', detail: 'SESSION SUSPENDED', tone: 'red' };
      case '4': return { title: 'SAFETY CAR', detail: 'DELTA ENFORCED', tone: 'yellow' };
      case '6': return { title: 'VIRTUAL SAFETY CAR', detail: 'POSITIVE DELTA', tone: 'yellow' };
      case '2': return { title: 'YELLOW FLAG', detail: 'REDUCE SPEED', tone: 'yellow' };
      default: return { title: 'TRACK CLEAR', detail: 'NORMAL CONDITIONS', tone: 'clear' };
    }
  })();

  return (
    <div className={`f1-track-status f1-track-status-${config.tone} ${className}`}>
      <div><span className="f1-status-mark" /> <strong>{config.title}</strong> <span>{config.detail}</span></div>
      <span className="f1-status-updated">UPDATED {trackStatus.updatedAt || '—'}</span>
    </div>
  );
};