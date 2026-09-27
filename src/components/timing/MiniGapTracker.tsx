import React from 'react';
import { TimingEntry } from '../../types/f1';
interface Props { entries: TimingEntry[]; currentLap: number; }
export const MiniGapTracker: React.FC<Props>=({entries,currentLap})=>{
  if(entries.length<2)return null; const leader=entries[0],p2=entries[1],p3=entries[2];
  return <section className="f1-strip" aria-label="Race summary">
    <div><span className="f1-strip-label">P2 GAP TO LEADER</span><strong>{p2.gap}</strong><small>{leader.driverCode} / {p2.driverCode}</small></div>
    <div><span className="f1-strip-label">P3 INTERVAL TO P2</span><strong>{p3?.interval||'—'}</strong><small>{p3?`${p2.driverCode} / ${p3.driverCode}`:'NO DATA'}</small></div>
    <div><span className="f1-strip-label">TYRES</span><strong>{leader.tyre.compound} / {p2.tyre.compound}</strong><small>{leader.tyre.age}L / {p2.tyre.age}L</small></div>
    <div><span className="f1-strip-label">LAP</span><strong>{currentLap||'—'} / {leader.currentLap||'—'}</strong><small>CURRENT LAP</small></div>
  </section>;
};