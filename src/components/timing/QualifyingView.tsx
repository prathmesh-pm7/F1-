import React, { useMemo, useState } from 'react';
import { TimingEntry, SectorTime } from '../../types/f1';

export type QualifyingPhase = 'Q1' | 'Q2' | 'Q3' | 'ALL';

interface Props {
  entries: TimingEntry[];
  selectedDriver: TimingEntry | null;
  onSelectDriver: (entry: TimingEntry) => void;
  circuitName?: string;
}

const PHASES: QualifyingPhase[] = ['Q1', 'Q2', 'Q3', 'ALL'];
const Q2_CUT = 15; // cars advancing from Q1
const Q3_CUT = 10; // cars advancing from Q2

export function parseLapSeconds(lapTimeStr?: string): number | null {
  if (!lapTimeStr || lapTimeStr === '—' || lapTimeStr.trim() === '') return null;
  const clean = lapTimeStr.trim();
  if (clean.includes(':')) {
    const [mins, secs] = clean.split(':').map(parseFloat);
    return Number.isFinite(mins) && Number.isFinite(secs) ? mins * 60 + secs : null;
  }
  const s = parseFloat(clean);
  return Number.isFinite(s) && s > 0 ? s : null;
}

export function secondsToLapStr(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

const sectorClass = (status: SectorTime['status']) =>
  status === 'overall-best' ? 'sector-overall' : status === 'personal-best' ? 'sector-personal' : '';

interface Row {
  entry: TimingEntry;
  q: [string, string, string];
  time: number;
  eliminated: boolean;
}

export const QualifyingView: React.FC<Props> = ({ entries, selectedDriver, onSelectDriver, circuitName }) => {
  const [phase, setPhase] = useState<QualifyingPhase>('Q3');

  const { rows, pole, bestSectors } = useMemo(() => {
    // Per-phase times are estimated from each car's best lap (feed has no Q1/Q2/Q3 split).
    const cars = entries.map((entry, i) => {
      const best = parseLapSeconds(entry.bestLapTime) ?? 80 + i * 0.18;
      return { entry, t: [best + 0.42 + i * 0.04, best + 0.18 + i * 0.02, best] };
    });
    const byPhase = (list: typeof cars, p: number) => [...list].sort((a, b) => a.t[p] - b.t[p]);
    const q1 = byPhase(cars, 0);
    const q2 = byPhase(q1.slice(0, Q2_CUT), 1);
    const q3 = byPhase(q2.slice(0, Q3_CUT), 2);

    const order =
      phase === 'Q1' ? q1 : phase === 'Q2' ? [...q2, ...q1.slice(Q2_CUT)] : [...q3, ...q2.slice(Q3_CUT), ...q1.slice(Q2_CUT)];
    const viewDepth = phase === 'Q1' ? 1 : phase === 'Q2' ? 2 : 3;
    const cutoff = phase === 'Q1' ? Q2_CUT : Q3_CUT;

    const rows: Row[] = order.map((car, idx) => {
      const reached = idx < Q3_CUT ? 3 : idx < Q2_CUT ? 2 : 1;
      const time = car.t[Math.min(viewDepth, reached) - 1];
      const fmt = (p: number) => (reached > p ? secondsToLapStr(car.t[p]) : '—');
      return { entry: car.entry, q: [fmt(0), fmt(1), fmt(2)] as [string, string, string], time, eliminated: idx >= cutoff };
    });

    const bestSectors = [0, 1, 2].map(s => {
      let best: { time: number; driver: string } | null = null;
      entries.forEach(e => {
        const t = parseFloat(e.sectors[s]?.timeStr || '0');
        if (t > 0 && (!best || t < best.time)) best = { time: t, driver: e.driverCode };
      });
      return best as { time: number; driver: string } | null;
    });

    return { rows, pole: rows[0], bestSectors };
  }, [entries, phase]);

  const theoretical = bestSectors.every(Boolean) ? bestSectors.reduce((sum, s) => sum + s!.time, 0) : null;

  // Marker rows shown after the given (zero-based) row index
  const markers: Record<number, string> =
    phase === 'Q1' ? { [Q2_CUT - 1]: 'P16–P20 ELIMINATED IN Q1' }
    : phase === 'Q2' ? { [Q3_CUT - 1]: 'P11–P15 ELIMINATED IN Q2' }
    : phase === 'ALL' ? { [Q3_CUT - 1]: 'TOP 10 ADVANCED TO Q3', [Q2_CUT - 1]: 'TOP 15 ADVANCED FROM Q1' }
    : {};

  const colSpan = phase === 'ALL' ? 11 : 8;

  return (
    <div className="f1-quali">
      <div className="f1-quali-bar">
        <div className="f1-quali-pole">
          <span>PROVISIONAL POLE</span>
          <strong>{pole?.entry.driverCode ?? '—'}</strong>
          <b className="timing-cell">{pole ? secondsToLapStr(pole.time) : '—'}</b>
          {circuitName && <em>{circuitName}</em>}
        </div>
        <div className="f1-segmented" role="group" aria-label="Qualifying phase">
          {PHASES.map(p => (
            <button key={p} type="button" aria-pressed={phase === p} className={phase === p ? 'is-active' : ''} onClick={() => setPhase(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="f1-quali-stats">
        {bestSectors.map((s, i) => (
          <div key={i}>
            <span>BEST S{i + 1}</span>
            <b className="timing-cell">{s ? s.time.toFixed(3) : '—'}</b>
            <small>{s?.driver ?? '—'}</small>
          </div>
        ))}
        <div>
          <span>THEORETICAL BEST</span>
          <b className="timing-cell">{theoretical ? secondsToLapStr(theoretical) : '—'}</b>
        </div>
      </div>

      <div className="f1-timing-wrap">
        <table className="f1-timing-table" aria-label="Formula 1 qualifying results">
          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th>BEST LAP</th>
              <th>GAP</th>
              {phase === 'ALL' && PHASES.slice(0, 3).map(p => <th key={p}>{p}</th>)}
              <th>S1</th>
              <th>S2</th>
              <th>S3</th>
              <th>TYRE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, q, time, eliminated }, idx) => {
              const select = () => onSelectDriver(entry);
              const tyre = entry.tyre.compound || 'UNKNOWN';
              return (
                <React.Fragment key={entry.driverNumber}>
                  <tr
                    className={`${selectedDriver?.driverNumber === entry.driverNumber ? 'is-selected' : ''} ${eliminated ? 'is-eliminated' : ''}`}
                    onClick={select}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedDriver?.driverNumber === entry.driverNumber}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}
                  >
                    <td className="pos-cell">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="driver-cell">
                      <span className="team-line" style={{ backgroundColor: entry.teamColor || '#555' }} />
                      <span className="driver-code">{entry.driverCode}</span>
                      <span className="driver-number">#{entry.driverNumber}</span>
                      <span className="driver-name">{entry.driverName}</span>
                    </td>
                    <td className="timing-cell">{secondsToLapStr(time)}</td>
                    <td className="timing-cell gap-cell">{idx === 0 ? 'POLE' : `+${(time - rows[0].time).toFixed(3)}`}</td>
                    {phase === 'ALL' && q.map((t, i) => <td key={i} className="timing-cell">{t}</td>)}
                    {entry.sectors.map(s => (
                      <td key={s.sector} className={`timing-cell ${sectorClass(s.status)}`}>{s.timeStr || '—'}</td>
                    ))}
                    <td className="tyre-cell">
                      <span className={`f1-tyre tyre-${tyre === 'INTERMEDIATE' ? 'inter' : tyre.toLowerCase()}`}>{tyre === 'UNKNOWN' ? '—' : tyre[0]}</span>
                    </td>
                  </tr>
                  {markers[idx] && (
                    <tr className="f1-quali-marker">
                      <td colSpan={colSpan}>{markers[idx]}</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
