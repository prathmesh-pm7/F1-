import React from 'react';
import { TimingEntry } from '../../types/f1';
import { formatGap, formatInterval } from '../../utils/timingFormat';

interface Props { entry: TimingEntry; isSelected: boolean; onSelect: (entry: TimingEntry) => void; }
const tyreClass: Record<string, string> = { SOFT: 'tyre-soft', MEDIUM: 'tyre-medium', HARD: 'tyre-hard', INTERMEDIATE: 'tyre-inter', WET: 'tyre-wet', UNKNOWN: 'tyre-unknown' };

export const TimingRow: React.FC<Props> = ({ entry, isSelected, onSelect }) => {
  const sectorClass = (status: string) => status === 'overall-best' ? 'sector-overall' : status === 'personal-best' ? 'sector-personal' : '';
  const tyre = entry.tyre.compound || 'UNKNOWN';
  return (
    <tr className={isSelected ? 'is-selected' : ''} onClick={() => onSelect(entry)} role="button" tabIndex={0} aria-pressed={isSelected} aria-label={entry.driverCode + ' position ' + entry.position + ', gap ' + (entry.gap || '—')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(entry); } }}>
      <td className="pos-cell">{String(entry.position).padStart(2, '0')}</td>
      <td className="driver-cell"><span className="team-line" style={{ backgroundColor: entry.teamColor || '#555' }} /><span className="driver-code">{entry.driverCode || '#' + entry.driverNumber}</span><span className="driver-number">#{entry.driverNumber}</span><span className="driver-name">{entry.driverName}</span></td>
      <td className="timing-cell gap-cell">{entry.position === 1 ? 'LEADER' : formatGap(entry.gap)}</td>
      <td className="timing-cell">{entry.position === 1 ? '—' : formatInterval(entry.interval)}</td>
      <td className="timing-cell hide-md">{entry.currentLap || '—'}</td>
      <td className="timing-cell hide-sm">{entry.lastLapTime || '—'}</td>
      <td className="timing-cell hide-lg">{entry.bestLapTime || '—'}</td>
      {entry.sectors.map((sector, index) => <td key={sector.sector} className={'timing-cell hide-lg ' + sectorClass(entry.sectors[index]?.status || '')}>{sector.timeStr || '—'}</td>)}
      <td className="tyre-cell"><span className={'f1-tyre ' + (tyreClass[tyre] || 'tyre-unknown')} title={tyre + ' / ' + entry.tyre.age + ' laps'}>{tyre === 'UNKNOWN' ? '—' : tyre[0]}</span><span className="tyre-name">{tyre === 'UNKNOWN' ? 'UNKNOWN' : tyre}</span><span className="tyre-age">{entry.tyre.age || 0}L</span></td>
      <td className="timing-cell pit-cell">{entry.pitCount}</td>
    </tr>
  );
};
