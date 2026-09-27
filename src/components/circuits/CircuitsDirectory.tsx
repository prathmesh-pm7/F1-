import React from 'react';
import { Circuit, DataProvenance } from '../../types/f1';
import { MapPin } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';
interface Props {circuits:Circuit[];selectedSeason:number;onSelectSeason:(season:number)=>void;availableSeasons?:number[];provenance?:DataProvenance;isLoading?:boolean;error?:string|null}
export const CircuitsDirectory:React.FC<Props>=({circuits,selectedSeason,onSelectSeason,availableSeasons=[2026,2025,2024,2023,2022],isLoading,error})=><div className="f1-info-page">
 <div className="f1-page-hero"><div><span className="f1-page-kicker">FORMULA 1 CIRCUIT DIRECTORY</span><h1>TRACKS</h1><p>Every circuit on the selected calendar, with track facts and verified lap records.</p></div><div className="f1-season-switch">{availableSeasons.map(s=><button key={s} onClick={()=>onSelectSeason(s)} className={selectedSeason===s?'is-active':''}>{s}</button>)}</div></div>
 {isLoading?<div className="f1-empty-card">LOADING CIRCUITS…</div>:error?<EmptyState type="not-found" title="CIRCUIT DATA UNAVAILABLE" message={error}/>:circuits.length===0?<EmptyState type="no-data" title="NO CIRCUITS FOUND" message="No circuit listings are available."/>:
 <div className="f1-circuit-grid">{circuits.map((c,i)=><article key={c.id} className="f1-circuit-card">
  <div className="f1-circuit-image">{c.imageUrl?<img src={c.imageUrl} alt={c.name} loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>:<span>TRACK / {String(i+1).padStart(2,'0')}</span>}<div className="f1-circuit-overlay"><b>R{String(i+1).padStart(2,'0')}</b><span>F1</span></div></div>
  <div className="f1-circuit-body"><div className="f1-circuit-title"><div><span>{c.country}</span><h2>{c.name}</h2><p><MapPin/> {c.location}</p></div><span className="f1-grade">GRADE 1</span></div>
   <div className="f1-circuit-stats"><div><span>LENGTH</span><strong>{c.lengthKm?c.lengthKm+' km':'—'}</strong></div><div><span>TURNS</span><strong>{c.turns??'—'}</strong></div><div><span>{selectedSeason >= 2026 ? 'AERO' : 'DRS'}</span><strong>{selectedSeason >= 2026 ? 'ACTIVE' : (c.drsZones ?? '—')}</strong></div><div><span>TYPE</span><strong>{c.circuitType??'—'}</strong></div></div>
   <div className="f1-record-card"><div><span>CIRCUIT RECORD</span><strong>{c.lapRecord?.time??'—'}</strong></div><div><span>DRIVER</span><strong>{c.lapRecord?.driver??'Record unavailable'}</strong><small>{c.lapRecord?.year??''}</small></div></div>
  </div>
 </article>)}</div>}
 </div>;
