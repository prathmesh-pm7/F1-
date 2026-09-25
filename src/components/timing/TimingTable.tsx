import React from 'react';
import { TimingEntry } from '../../types/f1';
import { TimingRow } from './TimingRow';

interface Props {
  entries: TimingEntry[];
  selectedDriver: TimingEntry | null;
  onSelectDriver: (entry: TimingEntry) => void;
}

export const TimingTable: React.FC<Props> = ({ entries, selectedDriver, onSelectDriver }) => {
  return (
    <div className="w-full overflow-x-auto border border-[#242c37] bg-[#111418]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#242c37] bg-[#0e1115] text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase select-none">
            <th className="py-2 px-2.5 text-center w-10">POS</th>
            <th className="py-2 px-2.5">DRIVER</th>
            <th className="py-2 px-2.5 text-right">GAP</th>
            <th className="py-2 px-2.5 text-right">INT</th>
            <th className="py-2 px-2.5 text-center hidden md:table-cell">LAP</th>
            <th className="py-2 px-2.5 text-right hidden sm:table-cell">LAST LAP</th>
            <th className="py-2 px-2.5 text-right hidden lg:table-cell">BEST</th>
            <th className="py-2 px-2 text-right hidden lg:table-cell">S1</th>
            <th className="py-2 px-2 text-right hidden lg:table-cell">S2</th>
            <th className="py-2 px-2 text-right hidden lg:table-cell">S3</th>
            <th className="py-2 px-2.5 text-center">TYRE</th>
            <th className="py-2 px-2.5 text-center">PIT</th>
            <th className="py-2 px-2.5 text-right hidden xl:table-cell">SPEED</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <TimingRow
              key={entry.driverCode}
              entry={entry}
              isSelected={selectedDriver?.driverCode === entry.driverCode}
              onSelect={onSelectDriver}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
