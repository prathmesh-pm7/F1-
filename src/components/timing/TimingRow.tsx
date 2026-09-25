import React from 'react';
import { TimingEntry } from '../../types/f1';

interface Props {
  entry: TimingEntry;
  isSelected: boolean;
  onSelect: (entry: TimingEntry) => void;
}

export const TimingRow: React.FC<Props> = ({ entry, isSelected, onSelect }) => {
  const getTyreColor = (compound: string) => {
    switch (compound) {
      case 'SOFT':
        return 'text-red-400 border-red-500/60 bg-red-950/20';
      case 'MEDIUM':
        return 'text-yellow-400 border-yellow-500/60 bg-yellow-950/20';
      case 'HARD':
        return 'text-neutral-100 border-neutral-400 bg-neutral-800/40';
      case 'INTERMEDIATE':
        return 'text-emerald-400 border-emerald-500/60 bg-emerald-950/20';
      case 'WET':
        return 'text-blue-400 border-blue-500/60 bg-blue-950/20';
      default:
        return 'text-neutral-400 border-neutral-600 bg-neutral-900';
    }
  };

  const getTyreLetter = (compound: string) => {
    return compound ? compound[0] : 'H';
  };

  const getSectorClass = (status: string) => {
    switch (status) {
      case 'overall-best':
        return 'text-fuchsia-400 font-bold'; // Official F1 purple
      case 'personal-best':
        return 'text-emerald-400 font-semibold'; // Official F1 green
      case 'pit':
        return 'text-amber-400';
      default:
        return 'text-neutral-300';
    }
  };

  return (
    <tr
      onClick={() => onSelect(entry)}
      className={`border-b border-[#1c222b] cursor-pointer transition-colors text-xs font-mono select-none ${
        isSelected
          ? 'bg-[#1a222c] border-l-2 border-l-[#e10600]'
          : 'bg-[#111418] hover:bg-[#161b22]'
      }`}
    >
      {/* 1. Position */}
      <td className="py-2 px-2.5 text-center font-bold text-neutral-200 w-10">
        <span className={entry.position <= 3 ? 'text-amber-400 font-black' : 'text-neutral-300'}>
          {String(entry.position).padStart(2, '0')}
        </span>
      </td>

      {/* 2. Driver & Team */}
      <td className="py-2 px-2.5">
        <div className="flex items-center gap-2">
          {/* Team color accent line */}
          <span
            className="w-1 h-3.5 inline-block shrink-0"
            style={{ backgroundColor: entry.teamColor }}
          />
          <span className="font-bold text-white text-xs tracking-wider">
            {entry.driverCode}
          </span>
          <span className="text-[10px] text-neutral-400 font-normal hidden sm:inline">
            #{entry.driverNumber}
          </span>
          <span className="text-[11px] text-neutral-400 hidden xl:inline truncate max-w-[130px]">
            {entry.driverName}
          </span>
        </div>
      </td>

      {/* 3. Gap to Leader */}
      <td className="py-2 px-2.5 text-right font-medium timing-cell">
        <span className={entry.position === 1 ? 'text-neutral-400 text-[11px]' : 'text-white font-semibold'}>
          {entry.gap}
        </span>
      </td>

      {/* 4. Interval to Car Ahead */}
      <td className="py-2 px-2.5 text-right font-medium timing-cell text-neutral-300">
        <span className={entry.position === 1 ? 'text-neutral-400' : 'text-neutral-200'}>
          {entry.interval}
        </span>
      </td>

      {/* 5. Lap */}
      <td className="py-2 px-2.5 text-center text-neutral-400 timing-cell hidden md:table-cell">
        {entry.currentLap}
      </td>

      {/* 6. Last Lap Time */}
      <td className="py-2 px-2.5 text-right timing-cell hidden sm:table-cell">
        <span className={entry.isOverallFastestLap ? 'text-fuchsia-400 font-bold' : 'text-neutral-200'}>
          {entry.lastLapTime}
        </span>
      </td>

      {/* 7. Best Lap Time */}
      <td className="py-2 px-2.5 text-right timing-cell hidden lg:table-cell">
        <span className={entry.isOverallFastestLap ? 'text-fuchsia-400 font-bold' : 'text-neutral-400'}>
          {entry.bestLapTime}
        </span>
      </td>

      {/* 8. Sector 1 */}
      <td className={`py-2 px-2 text-right timing-cell hidden lg:table-cell ${getSectorClass(entry.sectors[0]?.status)}`}>
        {entry.sectors[0]?.timeStr || '—'}
      </td>

      {/* 9. Sector 2 */}
      <td className={`py-2 px-2 text-right timing-cell hidden lg:table-cell ${getSectorClass(entry.sectors[1]?.status)}`}>
        {entry.sectors[1]?.timeStr || '—'}
      </td>

      {/* 10. Sector 3 */}
      <td className={`py-2 px-2 text-right timing-cell hidden lg:table-cell ${getSectorClass(entry.sectors[2]?.status)}`}>
        {entry.sectors[2]?.timeStr || '—'}
      </td>

      {/* 11. Tyre & Age */}
      <td className="py-2 px-2.5 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span
            className={`w-4 h-4 flex items-center justify-center text-[10px] font-black border ${getTyreColor(
              entry.tyre.compound
            )}`}
            title={`${entry.tyre.compound} compound (${entry.tyre.age} laps old)`}
          >
            {getTyreLetter(entry.tyre.compound)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono timing-cell">
            {entry.tyre.age}L
          </span>
        </div>
      </td>

      {/* 12. Pit Stop Count */}
      <td className="py-2 px-2.5 text-center text-neutral-300 timing-cell">
        <span className="text-xs">{entry.pitCount}</span>
      </td>

      {/* 13. Speed Trap */}
      <td className="py-2 px-2.5 text-right timing-cell text-neutral-400 hidden xl:table-cell">
        {entry.speedTrapKmH ? `${entry.speedTrapKmH.toFixed(1)} km/h` : '—'}
      </td>
    </tr>
  );
};
