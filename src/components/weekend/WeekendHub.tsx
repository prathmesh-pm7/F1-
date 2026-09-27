import React,{useEffect,useMemo,useState} from 'react';
import { GrandPrix,DataProvenance,SessionDetail,SessionSchedule,Driver,Team } from '../../types/f1';
import { SessionDetailPanel } from './SessionDetailPanel';
import { EmptyState } from '../shared/EmptyState';
interface Props {schedule:GrandPrix[];drivers:Driver[];teams:Team[];selectedSeason:number;onSelectSeason:(season:number)=>void;availableSeasons?:number[];provenance?:DataProvenance;isLoading?:boolean;error?:string|null;onLoadSession?:(gp:GrandPrix,session:SessionSchedule)=>Promise<SessionDetail>}
const statusLabel:Record<GrandPrix['status'],string>={COMPLETED:'COMPLETED',CURRENT:'CURRENT',UPCOMING:'UPCOMING'};
export const WeekendHub:React.FC<Props>=({schedule,drivers,teams,selectedSeason,onSelectSeason,availableSeasons=[2026,2025,2024,2023,2022],isLoading,error,onLoadSession})=>{
 const firstRound=useMemo(()=>schedule.find(g=>g.status==='CURRENT')?.round??schedule.find(g=>g.status==='UPCOMING')?.round??schedule[0]?.round??1,[schedule]); const [selectedRound,setSelectedRound]=useState(firstRound); const [selectedSession,setSelectedSession]=useState<SessionSchedule|null>(null); const [sessionDetail,setSessionDetail]=useState<SessionDetail|null>(null); const [sessionLoading,setSessionLoading]=useState(false); const [sessionError,setSessionError]=useState<string|null>(null);
 useEffect(()=>{setSelectedRound(firstRound);setSelectedSession(null);setSessionDetail(null)},[firstRound]);
 const currentGP=schedule.find(g=>g.round===selectedRound)??schedule.find(g=>g.status==='CURRENT')??schedule.find(g=>g.status==='UPCOMING')??schedule[0];
 const openSession=async(s:SessionSchedule)=>{setSelectedSession(s);setSessionDetail(null);setSessionError(null);if(!onLoadSession||!currentGP)return;setSessionLoading(true);try{setSessionDetail(await onLoadSession(currentGP,s))}catch(e){setSessionError(e instanceof Error?e.message:'Session data unavailable.')}finally{setSessionLoading(false)}};
 return <div className="f1-info-page">
  <div className="f1-page-hero"><div><span className="f1-page-kicker">FORMULA 1 SEASON {selectedSeason}</span><h1>RACE WEEKENDS</h1><p>Calendar, session schedule, driver line-up and complete weekend results.</p></div><div className="f1-season-switch">{availableSeasons.map(s=><button key={s} onClick={()=>{onSelectSeason(s);setSelectedRound(1)}} className={selectedSeason===s?'is-active':''}>{s}</button>)}</div></div>
  {isLoading?<div className="f1-empty-card">LOADING SEASON {selectedSeason}…</div>:error?<EmptyState type="not-found" title="SEASON DATA UNAVAILABLE" message={error}/>:schedule.length===0?<EmptyState type="no-data" title="NO RACE WEEKENDS" message="No published calendar is available."/>:<>
   <div className="f1-race-selector">{schedule.map(g=><button key={g.round} onClick={()=>setSelectedRound(g.round)} className={currentGP?.round===g.round?'is-active':''}><span>R{String(g.round).padStart(2,'0')}</span><b>{g.name}</b><small>{g.date}</small></button>)}</div>
   {currentGP&&<section className="f1-weekend-hero"><div className="f1-weekend-art"><div className="f1-weekend-round">ROUND {String(currentGP.round).padStart(2,'0')}</div><div className="f1-weekend-status">{statusLabel[currentGP.status]}</div><div className="f1-weekend-title">{currentGP.name}</div><div className="f1-weekend-circuit">{currentGP.circuit.name} · {currentGP.circuit.location}, {currentGP.country}</div><div className="f1-weekend-date">{currentGP.date}</div></div>
    <div className="f1-session-cards">{currentGP.sessions.map(s=><button key={s.id} onClick={()=>void openSession(s)} className={'f1-session-card '+(s.status==='LIVE'?'is-live':'')}><span>{s.type}</span><strong>{s.name}</strong><b>{s.status}</b><small>{new Date(s.startTime).toLocaleString([], {weekday:'short',hour:'2-digit',minute:'2-digit'})}</small></button>)}</div>
   </section>}
   {currentGP&&drivers.length>0&&<section className="f1-lineup-panel"><div className="f1-section-title"><span>WEEKEND ENTRY LIST</span><b>{drivers.length} DRIVERS</b></div><div className="f1-lineup-grid">{teams.map(t=>{const td=drivers.filter(d=>d.teamId===t.id);if(!td.length)return null;return <div className="f1-lineup-team" key={t.id} style={{'--team-card-color':t.color} as React.CSSProperties}><div><i/><b>{t.name}</b></div><div>{td.slice(0,2).map(d=><span key={d.id}>{d.headshotUrl&&<img src={d.headshotUrl} alt="" loading="lazy"/>}<strong>{d.code}</strong></span>)}</div></div>})}</div></section>}
   {selectedSession&&sessionLoading&&<div className="f1-empty-card">LOADING {selectedSession.name.toUpperCase()}…</div>}
   {selectedSession&&sessionError&&<div className="f1-empty-card">{sessionError}</div>}
   {selectedSession&&sessionDetail&&<SessionDetailPanel detail={sessionDetail} session={selectedSession} onClose={()=>{setSelectedSession(null);setSessionDetail(null)}}/>}
  </>}
 </div>;
};
