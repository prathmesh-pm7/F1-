import React, { useState } from 'react';
import { TimingEntry } from '../../types/f1';

interface Props { entry: TimingEntry; isSelected: boolean; onSelect: (entry: TimingEntry) => void; }

export const TimingMobileRow: React.FC<Props> = ({ entry, isSelected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const tyre = entry.tyre.compound || 'UNKNOWN';
  return (
    <article className={'f1-mobile-timing-row ' + (isSelected ? 'is-selected' : '')}>
      <button type="button" className="f1-mobile-timing-main" onClick={() => onSelect(entry)} aria-pressed={isSelected} aria-label={'Select ' + entry.driverCode + ' position ' + entry.position}>
        <span className="mobile-pos">{entry.position}</span>
        <span className="mobile-driver"><strong>{entry.driverCode}</strong><small>#{entry.driverNumber} · {entry.driverName}</small></span>
        <span><small>GAP</small><strong>{entry.position === 1 ? 'LEADER' : entry.gap || '—'}</strong></span>
        <span><small>INT</small><strong>{entry.position === 1 ? '—' : entry.interval || '—'}</strong></span>
        <span><small>TYRE</small><strong>{tyre === 'UNKNOWN' ? '—' : tyre} {entry.tyre.age || 0}L</strong></span>
      </button>
      <button type="button" className="f1-mobile-timing-expand" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={(expanded ? 'Collapse ' : 'Expand ') + entry.driverCode + ' lap details'}>⌄</button>
      {expanded && <div className="f1-mobile-timing-detail">
        <div><span>LAST LAP</span><strong>{entry.lastLapTime || '—'}</strong></div>
        <div><span>BEST LAP</span><strong>{entry.bestLapTime || '—'}</strong></div>
        {entry.sectors.map((sector, index) => <div key={sector.sector}><span>SECTOR {index + 1}</span><strong>{sector.timeStr || '—'}</strong></div>)}
      </div>}
    </article>
  );
};
