import React from 'react';
import { TimingEntry } from '../../types/f1';
interface Props { entry: TimingEntry; isSelected: boolean; onSelect: (entry: TimingEntry) => void; }
const tyreClass: Record<string,string>={SOFT:'tyre-soft',MEDIUM:'tyre-medium',HARD:'tyre-hard',INTERMEDIATE:'tyre-inter',WET:'tyre-wet',UNKNOWN:'tyre-unknown'};
export const TimingRow: React.FC<Props>=({entry,isSelected,onSelect})=>{
  const sectorClass=(status:string)=>status==='overall-best'?'sector-overall':status==='personal-best'?'sector-personal':'';
  const tyre=entry.tyre.compound||'UNKNOWN';
  return <tr className={isSelected?'is-selected':''} onClick={()=>onSelect(entry)}>
    <td className="pos-cell">{String(entry.position).padStart(2,'0')}</td>
    <td className="driver-cell"><span className="team-line" style={{backgroundColor:entry.teamColor||'#555'}}/><span className="driver-code">{entry.driverCode||`#${entry.driverNumber}`}</span><span className="driver-number">#{entry.driverNumber}</span><span className="driver-name">{entry.driverName}</span></td>
    <td className="timing-cell gap-cell">{entry.position===1?'LEADER':entry.gap||'—'}</td>
    <td className="timing-cell">{entry.position===1?'—':entry.interval||'—'}</td>
    <td className="timing-cell hide-md">{entry.currentLap||'—'}</td><td className="timing-cell hide-sm">{entry.lastLapTime||'—'}</td>
    <td className="timing-cell hide-lg">{entry.bestLapTime||'—'}</td><td className={`timing-cell hide-lg ${sectorClass(entry.sectors[0]?.status||'')}`}>{entry.sectors[0]?.timeStr||'—'}</td>
    <td className={`timing-cell hide-lg ${sectorClass(entry.sectors[1]?.status||'')}`}>{entry.sectors[1]?.timeStr||'—'}</td><td className={`timing-cell hide-lg ${sectorClass(entry.sectors[2]?.status||'')}`}>{entry.sectors[2]?.timeStr||'—'}</td>
    <td><span className={`f1-tyre ${tyreClass[tyre]||'tyre-unknown'}`} title={`${tyre} / ${entry.tyre.age} laps`}>{tyre==='UNKNOWN'?'—':tyre[0]}</span><span className="tyre-age">{entry.tyre.age||0}</span></td>
    <td className="timing-cell pit-cell">{entry.pitCount}</td>
  </tr>;
};