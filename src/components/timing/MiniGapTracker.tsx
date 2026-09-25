import React from 'react';
import { TimingEntry } from '../../types/f1';

interface Props {
  entries: TimingEntry[];
  currentLap: number;
}

export const MiniGapTracker: React.FC<Props> = ({ entries, currentLap }) => {
  if (entries.length < 2) return null;

  const leader = entries[0];
  const p2 = entries[1];
  const p3 = entries[2];

  const gapP2 = p2.gapToLeaderSeconds;
  const gapP3 = p3 ? p3.gapToLeaderSeconds : 0;

  return (
    <div className="border border-[#242c37] bg-[#111418] p-2.5 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1c222b] pb-1.5 mb-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
          LEADER GAP & TRACK DELTA
        </span>
        <span className="text-[10px] text-neutral-400">
          P1 ({leader.driverCode}) vs P2 ({p2.driverCode})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Gap P1-P2 */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">GAP TO P2</div>
          <div className="text-base font-bold text-white timing-cell">
            {p2.gap}
          </div>
          <div className="text-[10px] text-neutral-400">
            {leader.driverCode} vs {p2.driverCode}
          </div>
        </div>

        {/* Gap P2-P3 */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">INT P2 TO P3</div>
          <div className="text-base font-bold text-neutral-200 timing-cell">
            {p3 ? p3.interval : '—'}
          </div>
          <div className="text-[10px] text-neutral-400">
            {p3 ? `${p3.driverCode} interval` : '—'}
          </div>
        </div>

        {/* Tyre delta */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">TYRE STATUS</div>
          <div className="text-xs font-semibold text-neutral-200 mt-1">
            <span className="text-neutral-100">{leader.driverCode}: {leader.tyre.compound[0]}({leader.tyre.age}L)</span> vs <span className="text-amber-400">{p2.driverCode}: {p2.tyre.compound[0]}({p2.tyre.age}L)</span>
          </div>
          <div className="text-[10px] text-neutral-400 font-mono">
            {Math.abs(leader.tyre.age - p2.tyre.age)} laps age difference
          </div>
        </div>

        {/* Track Lap Status */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">RACE PROGRESS</div>
          <div className="text-xs font-bold text-neutral-100 mt-1">
            <span>LAP {currentLap} CLASSIFICATION</span>
          </div>
          <div className="text-[10px] text-neutral-400">
            {entries.length} cars on timing loop
          </div>
        </div>
      </div>
    </div>
  );
};
