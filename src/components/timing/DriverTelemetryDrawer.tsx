import React from 'react';
import { TimingEntry } from '../../types/f1';
import { X, Gauge, Clock, Shield, Flame } from 'lucide-react';

interface Props {
  entry: TimingEntry | null;
  onClose: () => void;
}

export const DriverTelemetryDrawer: React.FC<Props> = ({ entry, onClose }) => {
  if (!entry) return null;

  return (
    <div className="border border-[#242c37] bg-[#111418] p-4 font-mono text-xs text-neutral-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#242c37] pb-3 mb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-7 inline-block"
            style={{ backgroundColor: entry.teamColor }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">{entry.driverName}</span>
              <span className="text-xs px-1.5 py-0.2 bg-[#1c222b] text-neutral-300 border border-[#2b3543] font-bold">
                #{entry.driverNumber}
              </span>
              <span className="text-xs text-neutral-400 font-semibold">{entry.driverCode}</span>
            </div>
            <div className="text-[11px] text-neutral-400">
              {entry.teamName} · P{entry.position}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-[#1f2631] text-neutral-400 hover:text-white border border-transparent hover:border-[#333d4d]"
          title="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="border border-[#1f2632] bg-[#161a20] p-2">
          <div className="text-[10px] text-neutral-400 uppercase">GAP TO P1</div>
          <div className="text-sm font-bold text-white timing-cell">{entry.gap}</div>
        </div>

        <div className="border border-[#1f2632] bg-[#161a20] p-2">
          <div className="text-[10px] text-neutral-400 uppercase">INTERVAL</div>
          <div className="text-sm font-bold text-neutral-200 timing-cell">{entry.interval}</div>
        </div>

        <div className="border border-[#1f2632] bg-[#161a20] p-2">
          <div className="text-[10px] text-neutral-400 uppercase">LAST LAP</div>
          <div className="text-sm font-bold text-white timing-cell">{entry.lastLapTime}</div>
        </div>

        <div className="border border-[#1f2632] bg-[#161a20] p-2">
          <div className="text-[10px] text-neutral-400 uppercase">BEST LAP</div>
          <div className="text-sm font-bold text-fuchsia-400 timing-cell">{entry.bestLapTime}</div>
        </div>
      </div>

      {/* Sector Times */}
      <div className="border border-[#1f2632] bg-[#161a20] p-3 mb-4">
        <div className="text-[10px] text-neutral-400 uppercase font-bold mb-2">
          SECTOR SPLIT TIMES (LAP {entry.currentLap})
        </div>
        <div className="grid grid-cols-3 gap-2">
          {entry.sectors.map((sec, idx) => (
            <div key={idx} className="border border-[#252e3b] bg-[#111418] p-2 text-center">
              <div className="text-[10px] text-neutral-400">SECTOR {idx + 1}</div>
              <div className={`text-sm font-bold timing-cell ${
                sec.status === 'overall-best'
                  ? 'text-fuchsia-400'
                  : sec.status === 'personal-best'
                  ? 'text-emerald-400'
                  : 'text-neutral-200'
              }`}>
                {sec.timeStr}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-neutral-400 mt-0.5">
                {sec.status.replace('-', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tyre Stint Strategy & Pit History */}
      <div className="border border-[#1f2632] bg-[#161a20] p-3 mb-4">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-bold mb-2">
          <span>TYRE STRATEGY & STINTS</span>
          <span>{entry.pitCount} PIT STOP{entry.pitCount !== 1 ? 'S' : ''}</span>
        </div>

        <div className="space-y-1.5">
          {entry.stints.map((stint) => (
            <div
              key={stint.stintNumber}
              className="flex items-center justify-between px-2.5 py-1.5 border border-[#222934] bg-[#111418]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-400">STINT {stint.stintNumber}:</span>
                <span className={`px-1.5 py-0.2 text-[10px] font-black border ${
                  stint.compound === 'HARD' ? 'text-neutral-100 border-neutral-400' :
                  stint.compound === 'MEDIUM' ? 'text-yellow-400 border-yellow-500' :
                  'text-red-400 border-red-500'
                }`}>
                  {stint.compound}
                </span>
                <span className="text-neutral-400 text-[11px]">
                  (Laps {stint.startLap} - {stint.endLap || 'CURRENT'})
                </span>
              </div>
              <span className="font-bold text-neutral-200">
                {stint.lapsUsed} LAPS
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Speed Trap & Telemetry Details */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-[#1c222b] pt-2">
        <span className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-neutral-400" />
          <span>SPEED TRAP: <strong className="text-white">{entry.speedTrapKmH !== undefined ? `${entry.speedTrapKmH.toFixed(1)} km/h` : '—'}</strong></span>
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>DRS ZONE: <strong className={entry.drsEligible === true ? 'text-emerald-400' : entry.drsEligible === false ? 'text-neutral-400' : 'text-neutral-500'}>{entry.drsEligible === true ? 'ELIGIBLE' : entry.drsEligible === false ? 'INELIGIBLE' : '—'}</strong></span>
        </span>
      </div>
    </div>
  );
};
