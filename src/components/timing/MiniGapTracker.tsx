import React from 'react';
import { TimingEntry } from '../../types/f1';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
  entries: TimingEntry[];
  currentLap: number;
}

export const MiniGapTracker: React.FC<Props> = ({ entries, currentLap }) => {
  if (entries.length < 2) return null;

  const leader = entries[0];
  const p2 = entries[1];
  const p3 = entries[2];

  // In Monza 2024:
  // At lap 38 Piastri was +11.24s. Piastri was gaining ~0.65s - 1.1s per lap on fresh hards
  const gapP2 = p2.gapToLeaderSeconds;
  const gapP3 = p3 ? p3.gapToLeaderSeconds : 0;

  // Pace differential
  const paceDiffP2 = -0.57; // Piastri closing on Leclerc
  const projectedCatchLap = gapP2 > 0 && paceDiffP2 < 0 ? Math.round(currentLap + gapP2 / Math.abs(paceDiffP2)) : null;

  return (
    <div className="border border-[#242c37] bg-[#111418] p-2.5 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1c222b] pb-1.5 mb-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
          LEADER GAP & PACE DELTA
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
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <TrendingDown className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400">P2 CLOSING (~0.57s/L)</span>
          </div>
        </div>

        {/* Gap P2-P3 */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">INT P2 TO P3</div>
          <div className="text-base font-bold text-neutral-200 timing-cell">
            {p3 ? p3.interval : '—'}
          </div>
          <div className="text-[10px] text-neutral-400">
            {p3 ? `${p3.driverCode} +${(gapP3 - gapP2).toFixed(3)}s` : ''}
          </div>
        </div>

        {/* Tyre delta */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">TYRE ADVANTAGE</div>
          <div className="text-xs font-semibold text-neutral-200 mt-1">
            <span className="text-red-400">LEC: H({leader.tyre.age}L)</span> vs <span className="text-amber-400">PIA: H({p2.tyre.age}L)</span>
          </div>
          <div className="text-[10px] text-amber-400/90 font-mono">
            PIA tyres 20 laps fresher
          </div>
        </div>

        {/* Catch forecast */}
        <div>
          <div className="text-[10px] text-neutral-400 uppercase">PROJECTED CATCH</div>
          <div className="text-xs font-bold text-neutral-100 mt-1">
            {projectedCatchLap && projectedCatchLap <= 53 ? (
              <span className="text-amber-400">LAP ~{projectedCatchLap} / 53</span>
            ) : (
              <span className="text-emerald-400">DEFENSE HOLDS (P1 LEAD SAFE)</span>
            )}
          </div>
          <div className="text-[10px] text-neutral-400">
            {53 - currentLap} laps remaining
          </div>
        </div>
      </div>
    </div>
  );
};
