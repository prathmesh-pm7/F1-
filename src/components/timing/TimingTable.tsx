import React from 'react';
import { TimingEntry } from '../../types/f1';
import { TimingRow } from './TimingRow';
interface Props { entries: TimingEntry[]; selectedDriver: TimingEntry | null; onSelectDriver: (entry: TimingEntry) => void; }
export const TimingTable: React.FC<Props> = ({ entries, selectedDriver, onSelectDriver }) => (
  <div className="f1-timing-wrap" aria-label="Live timing">
    <table className="f1-timing-table">
      <thead><tr><th>POS</th><th>DRIVER</th><th>GAP</th><th>INT</th><th className="hide-md">LAP</th><th className="hide-sm">LAST</th><th className="hide-lg">BEST</th><th className="hide-lg">S1</th><th className="hide-lg">S2</th><th className="hide-lg">S3</th><th>TYRE</th><th>PIT</th></tr></thead>
      <tbody>{entries.map(entry => <TimingRow key={entry.driverNumber} entry={entry} isSelected={selectedDriver?.driverNumber === entry.driverNumber} onSelect={onSelectDriver} />)}</tbody>
    </table>
  </div>
);