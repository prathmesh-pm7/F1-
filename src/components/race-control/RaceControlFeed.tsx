import React, { useState } from 'react';
import { RaceControlMessage } from '../../types/f1';
import { Filter } from 'lucide-react';

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

  const getCategoryClass = (category: string, flag?: string) => {
    if (category === 'SAFETY_CAR') return 'text-amber-400 font-bold';
    if (category === 'PENALTY') return 'text-red-400 font-bold';
    if (category === 'INVESTIGATION' || category === 'TRACK_LIMITS') return 'text-amber-300';
    if (category === 'FLAG') {
      if (flag === 'YELLOW' || flag === 'DOUBLE_YELLOW') return 'text-yellow-400 font-bold';
      if (flag === 'RED') return 'text-red-400 font-bold';
      if (flag === 'CLEAR' || flag === 'GREEN') return 'text-emerald-400';
    }
    return 'text-neutral-400';
  };

  return (
    <div className={`border border-[#242c37] bg-[#111418] font-mono text-xs ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#242c37] bg-[#0e1115]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-neutral-400"></span>
          <span className="font-bold tracking-wider text-neutral-200 uppercase">
            FIA RACE CONTROL LOG
          </span>
          <span className="text-[10px] text-neutral-400">({messages.length} events)</span>
        </div>

        {/* Functional filter control */}
        <div className="flex items-center gap-1">
          {['ALL', 'FLAGS', 'PENALTIES'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2 py-0.5 text-[10px] font-mono tracking-wider transition-colors ${
                filter === tab
                  ? 'bg-[#222a36] text-white font-bold border border-[#3b4759]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Table/Log */}
      <div className="max-h-72 overflow-y-auto divide-y divide-[#1c222b]">
        {filteredMessages.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 text-xs">
            No race control messages for this filter.
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 px-3 py-2 hover:bg-[#161a20] transition-colors"
            >
              {/* Timestamp */}
              <span className="text-neutral-400 shrink-0 w-16 text-[11px] timing-cell">
                {msg.time}
              </span>

              {/* Lap if available */}
              {msg.lap && (
                <span className="text-neutral-400 shrink-0 w-12 text-[10px]">
                  LAP {msg.lap}
                </span>
              )}

              {/* Category / Type badge */}
              <span className={`shrink-0 w-24 text-[11px] uppercase ${getCategoryClass(msg.category, msg.flag)}`}>
                {msg.flag || msg.category}
              </span>

              {/* Message content */}
              <div className="flex-1 text-neutral-200 text-xs font-mono">
                {msg.message}
              </div>

              {/* Source Provenance */}
              <span className="text-[9px] text-neutral-400 shrink-0 hidden md:inline">
                {msg.provenance?.provider || 'FIA'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
