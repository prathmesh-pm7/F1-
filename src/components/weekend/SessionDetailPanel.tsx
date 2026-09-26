import React, { useMemo, useState } from 'react';
import { SessionDetail, SessionSchedule } from '../../types/f1';

interface Props { detail: SessionDetail; session: SessionSchedule; onClose: () => void; }

export const SessionDetailPanel: React.FC<Props> = ({ detail, onClose }) => {
  const [lapFilter, setLapFilter] = useState<number | 'ALL'>('ALL');
  const lapRows = useMemo(() => lapFilter === 'ALL' ? detail.laps : detail.laps.filter(l => l.lapNumber === lapFilter), [detail.laps, lapFilter]);
  const maxLap = detail.laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);
  const winner = detail.results.find(r => r.position === 1);

  return (
    <section className="border-y border-[#242c37] bg-[#0b0e12]">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-[#1b2027]">
        <div>
          <div className="text-[8px] tracking-[.16em] text-[var(--team-accent)]">SESSION DATA / {detail.sessionKey}</div>
          <h3 className="mt-1 text-lg font-bold text-white">{detail.sessionName.toUpperCase()}</h3>
          <div className="mt-1 text-[9px] text-neutral-500">{detail.circuitName} · {new Date(detail.startTime).toLocaleString()}</div>
        </div>
        <button onClick={onClose} className="px-2 py-1 border border-[#2a313a] text-[8px] text-neutral-500 hover:text-white">CLOSE</button>
      </div>

      {winner && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#1b2027]">
          <div className="p-3 border-r border-[#1b2027]"><span className="text-[8px] text-neutral-600">WINNER / P1</span><strong className="block mt-1 text-white">{winner.driverName} <span className="text-neutral-500">{winner.driverCode}</span></strong></div>
          <div className="p-3 border-r border-[#1b2027]"><span className="text-[8px] text-neutral-600">TEAM</span><strong className="block mt-1 text-white">{winner.teamName}</strong></div>
          <div className="p-3 border-r border-[#1b2027]"><span className="text-[8px] text-neutral-600">BEST / RESULT</span><strong className="block mt-1 text-white timing-cell">{winner.bestLap ?? '—'}</strong></div>
          <div className="p-3"><span className="text-[8px] text-neutral-600">LAPS</span><strong className="block mt-1 text-white timing-cell">{winner.laps}</strong></div>
        </div>
      )}

      <div className="p-4">
        <div className="f1-section-heading"><span>CLASSIFICATION</span><span>{detail.results.length} DRIVERS</span></div>
        <div className="overflow-x-auto border-y border-[#1c222b]">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="text-[8px] text-neutral-600 border-b border-[#1c222b]"><th className="p-2">POS</th><th className="p-2">DRIVER</th><th className="p-2">TEAM</th><th className="p-2">BEST / TIME</th><th className="p-2">GAP</th><th className="p-2">LAPS</th><th className="p-2">STATUS</th></tr></thead>
            <tbody>{detail.results.map(r => (
              <tr key={r.driverNumber} className="border-b border-[#151a20] text-[10px]">
                <td className="p-2 timing-cell text-neutral-500">{r.position ?? '—'}</td>
                <td className="p-2 font-bold text-white">{r.driverName} <span className="text-neutral-600">{r.driverCode}</span></td>
                <td className="p-2 text-neutral-400">{r.teamName}</td><td className="p-2 timing-cell text-neutral-200">{r.bestLap ?? '—'}</td>
                <td className="p-2 timing-cell text-neutral-400">{r.gap ?? '—'}</td><td className="p-2 timing-cell">{r.laps}</td>
                <td className="p-2 text-neutral-500">{r.dnf ? 'DNF' : r.dns ? 'DNS' : r.dsq ? 'DSQ' : 'CLASSIFIED'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="mt-5 f1-section-heading"><span>LAP-BY-LAP</span><span>{maxLap ? 'LAP 1–' + maxLap : 'NO LAP DATA'}</span></div>
        {maxLap > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setLapFilter('ALL')} className={'px-2 py-1 border text-[8px] ' + (lapFilter === 'ALL' ? 'border-[var(--team-accent)] text-white' : 'border-[#242c37] text-neutral-500')}>ALL LAPS</button>
            <select value={lapFilter === 'ALL' ? 'ALL' : lapFilter} onChange={e => setLapFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} className="bg-[#0f1216] border border-[#242c37] text-[9px] text-neutral-300 px-2 py-1">
              <option value="ALL">Select lap…</option>
              {Array.from({ length: maxLap }, (_, i) => <option key={i + 1} value={i + 1}>Lap {i + 1}</option>)}
            </select>
          </div>
        )}
        <div className="max-h-[420px] overflow-auto border-y border-[#1c222b]">
          <table className="w-full min-w-[760px] text-left">
            <thead className="sticky top-0 bg-[#0b0e12]"><tr className="text-[8px] text-neutral-600 border-b border-[#1c222b]"><th className="p-2">LAP</th><th className="p-2">DRIVER</th><th className="p-2">LAP TIME</th><th className="p-2">S1</th><th className="p-2">S2</th><th className="p-2">S3</th><th className="p-2">SPEED TRAP</th></tr></thead>
            <tbody>{lapRows.map((l, i) => (
              <tr key={l.lapNumber + '-' + l.driverNumber + '-' + i} className="border-b border-[#151a20] text-[9px]">
                <td className="p-2 timing-cell text-neutral-500">{l.lapNumber}</td><td className="p-2 text-white">{l.driverName} <span className="text-neutral-600">{l.driverCode}</span></td>
                <td className="p-2 timing-cell text-neutral-200">{l.lapTime}</td><td className="p-2 timing-cell">{l.sector1 ?? '—'}</td><td className="p-2 timing-cell">{l.sector2 ?? '—'}</td><td className="p-2 timing-cell">{l.sector3 ?? '—'}</td><td className="p-2 timing-cell">{l.speedTrap ? l.speedTrap + ' km/h' : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {detail.pitStops.length > 0 && (
          <>
            <div className="mt-5 f1-section-heading"><span>PIT STOPS</span><span>{detail.pitStops.length}</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1c222b]">
              {detail.pitStops.map((p, i) => <div key={i} className="bg-[#0d1014] p-2"><div className="text-[9px] text-white">{p.driverName} <span className="text-neutral-600">{p.driverCode}</span></div><div className="text-[8px] text-neutral-500 mt-1">LAP {p.lap} · STOP {p.stopDuration ? p.stopDuration.toFixed(1) + 's' : '—'}</div></div>)}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
