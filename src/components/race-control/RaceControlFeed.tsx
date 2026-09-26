import React, { useState } from 'react';
import { RaceControlMessage } from '../../types/f1';

interface Props {
  messages: RaceControlMessage[];
  className?: string;
}

export const RaceControlFeed: React.FC<Props> = ({ messages, className = '' }) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredMessages = messages.filter((m) => {
    if (filter === 'ALL') return true;
    if (filter === 'FLAGS') return m.category === 'FLAG' || m.category === 'SAFETY_CAR';
    if (filter === 'PENALTIES') return m.category === 'PENALTY' || m.category === 'INVESTIGATION' || m.category === 'TRACK_LIMITS';
    return true;
  });

  const getTypeClass = (category: string, flag?: string) => {
    if (category === 'PENALTY' || flag === 'RED') return 'rc-type-danger';
    if (category === 'SAFETY_CAR' || category === 'INVESTIGATION' || category === 'TRACK_LIMITS' || flag === 'YELLOW' || flag === 'DOUBLE_YELLOW') return 'rc-type-warning';
    if (category === 'FLAG' && (flag === 'CLEAR' || flag === 'GREEN')) return 'rc-type-clear';
    return '';
  };

  return (
    <div className={`f1-race-log ${className}`}>
      <div className="f1-race-log-head">
        <div>
          <span className="f1-race-log-title">RACE CONTROL</span>
          <span className="f1-race-log-count">{messages.length ? `${messages.length} EVENTS` : 'NO EVENTS'}</span>
        </div>
        <div className="f1-race-log-filters">
          {['ALL', 'FLAGS', 'PENALTIES'].map(tab => (
            <button key={tab} type="button" onClick={() => setFilter(tab)} className={filter === tab ? 'is-active' : ''}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="f1-race-log-table">
        <div className="f1-race-log-row f1-race-log-columns">
          <span>TIME</span><span>TYPE</span><span>MESSAGE</span>
        </div>
        {filteredMessages.length === 0 ? (
          <div className="f1-race-log-empty">No race-control messages for this session.</div>
        ) : (
          filteredMessages.map(msg => (
            <div key={msg.id} className="f1-race-log-row">
              <span className="rc-time">{msg.time}</span>
              <span className={`rc-type ${getTypeClass(msg.category, msg.flag)}`}>{msg.flag || msg.category}</span>
              <span className="rc-message">{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};