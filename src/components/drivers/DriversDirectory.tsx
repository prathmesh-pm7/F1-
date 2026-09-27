import React, { useState } from 'react';
import { Driver, DataProvenance } from '../../types/f1';
import { Search, X } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';

interface Props { drivers: Driver[]; selectedSeason: number; onSelectSeason: (season:number)=>void; availableSeasons?:number[]; provenance?:DataProvenance; isLoading?:boolean; error?:string|null; }

export const DriversDirectory: React.FC<Props> = ({drivers,selectedSeason,onSelectSeason,availableSeasons=[2026,2025,2024,2023,2022],isLoading,error}) => {
 const [searchTerm,setSearchTerm]=useState(''); const [selectedDriver,setSelectedDriver]=useState<Driver|null>(null);
 const filtered=drivers.filter(d=>[d.fullName,d.code,d.teamName,String(d.number)].some(v=>v.toLowerCase().includes(searchTerm.toLowerCase())));
 return <div className="f1-info-page">
  <div className="f1-page-hero"><div><span className="f1-page-kicker">2026 FIA FORMULA 1 WORLD CHAMPIONSHIP</span><h1>DRIVERS</h1><p>Driver profiles, championship numbers and current team information.</p></div><div className="f1-season-switch">{availableSeasons.map(s=><button key={s} onClick={()=>{onSelectSeason(s);setSelectedDriver(null)}} className={selectedSeason===s?'is-active':''}>{s}</button>)}</div></div>
  <div className="f1-filterbar"><div className="f1-search-field"><Search/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="SEARCH DRIVER, CODE OR NUMBER"/></div><span>{filtered.length} DRIVERS</span></div>
  {isLoading?<div className="f1-empty-card">LOADING DRIVER DATA…</div>:error?<EmptyState type="not-found" title="DRIVER DATA UNAVAILABLE" message={error}/>:filtered.length===0?<EmptyState type="no-data" title="NO DRIVERS FOUND" message="No driver matched your search."/>:
  <div className="f1-driver-grid">{filtered.map((d,index)=>{const selected=selectedDriver?.id===d.id;return <React.Fragment key={d.id}>
   <article className={'f1-driver-card '+(selected?'is-selected':'')} style={{'--driver-accent':d.teamColor} as React.CSSProperties} onClick={()=>setSelectedDriver(selected?null:d)}>
    <div className="f1-driver-card-top"><span className="f1-driver-pos">{String(d.championshipPosition??index+1).padStart(2,'0')}</span><span className="f1-driver-code">{d.code}</span></div>
    <div className="f1-driver-image-wrap">{d.headshotUrl?<img src={d.headshotUrl} alt="" className="f1-driver-image" loading="lazy"/>:<div className="f1-driver-image-placeholder">#{d.number}</div>}<span className="f1-driver-number">{d.number?'#'+d.number:'—'}</span></div>
    <div className="f1-driver-card-bottom"><div><span className="f1-driver-team">{d.teamName}</span><h2>{d.fullName}</h2><span className="f1-driver-car">{d.chassis??'CAR —'}</span></div><div className="f1-driver-points"><strong>{d.points??0}</strong><span>PTS</span></div></div>
   </article>
   {selected&&<section className="f1-profile-panel"><div className="f1-profile-visual">{d.headshotUrl?<img src={d.headshotUrl} alt="" loading="lazy"/>:<span>#{d.number}</span>}</div><div className="f1-profile-main"><div className="f1-profile-topline"><span style={{color:d.teamColor}}>DRIVER PROFILE / {d.code}</span><button onClick={e=>{e.stopPropagation();setSelectedDriver(null)}}><X/></button></div><h2>{d.fullName}</h2><p>{d.teamName} · {d.chassis??'CAR —'} · {d.nationality||'Nationality unavailable'} · #{d.number || '—'}</p><div className="f1-stat-grid"><div><span>CHAMPIONSHIP</span><strong>P{d.championshipPosition??'—'}</strong></div><div><span>POINTS</span><strong>{d.points??0}</strong></div><div><span>SEASON WINS</span><strong>{d.wins??0}</strong></div><div><span>SEASON PODIUMS</span><strong>{d.podiums??'—'}</strong></div><div><span>DATE OF BIRTH</span><strong>{d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString('en-GB') : '—'}</strong></div><div><span>PERMANENT NO.</span><strong>#{d.permanentNumber ?? d.number ?? '—'}</strong></div><div><span>CAREER STARTS</span><strong>{d.careerStarts??'—'}</strong></div><div><span>CAREER POLES</span><strong>{d.careerPoles??'—'}</strong></div></div><div className="f1-driver-detail-grid"><div><span>FULL NAME</span><b>{d.fullName}</b></div><div><span>NATIONALITY</span><b>{d.nationality||'—'}</b></div><div><span>TEAM</span><b>{d.teamName}</b></div><div><span>CHASSIS</span><b>{d.chassis??'—'}</b></div></div></div></section>}
  </React.Fragment>})}</div>}
 </div>;
};
