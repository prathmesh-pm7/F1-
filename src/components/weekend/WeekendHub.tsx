import React, { useEffect, useMemo, useState } from 'react';
import { GrandPrix, DataProvenance, SessionDetail, SessionSchedule, Driver, Team } from '../../types/f1';
import { SessionDetailPanel } from './SessionDetailPanel';
import { PageHero } from '../shared/PageHero';
import { SeasonSwitch } from '../shared/SeasonSwitch';
import { LoadState } from '../shared/LoadState';
import { DriverHeadshot } from '../shared/DriverHeadshot';

interface Props {
  schedule: GrandPrix[];
  drivers: Driver[];
  teams: Team[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
  onLoadSession?: (gp: GrandPrix, session: SessionSchedule) => Promise<SessionDetail>;
  onReplayRace?: (gp: GrandPrix) => Promise<void>;
}

const statusLabel: Record<GrandPrix['status'], string> = { COMPLETED: 'COMPLETED', CURRENT: 'CURRENT', UPCOMING: 'UPCOMING' };

export const WeekendHub: React.FC<Props> = ({ schedule, drivers, teams, selectedSeason, onSelectSeason, availableSeasons = [], isLoading, error, onLoadSession, onReplayRace }) => {
  const firstRound = useMemo(() => schedule.find(g => g.status === 'CURRENT')?.round ?? schedule.find(g => g.status === 'UPCOMING')?.round ?? schedule[0]?.round ?? 1, [schedule]);
  const [selectedRound, setSelectedRound] = useState(firstRound);
  const [selectedSession, setSelectedSession] = useState<SessionSchedule | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRound(firstRound);
    setSelectedSession(null);
    setSessionDetail(null);
  }, [firstRound]);

  const currentGP = schedule.find(g => g.round === selectedRound) ?? schedule[0];

  const openSession = async (session: SessionSchedule) => {
    setSelectedSession(session);
    setSessionDetail(null);
    setSessionError(null);
    if (!onLoadSession || !currentGP) return;
    setSessionLoading(true);
    try { setSessionDetail(await onLoadSession(currentGP, session)); }
    catch (e) { setSessionError(e instanceof Error ? e.message : 'Session data unavailable.'); }
    finally { setSessionLoading(false); }
  };

  return (
    <div className="f1-info-page">
      <PageHero kicker={'FORMULA 1 SEASON ' + selectedSeason} title="RACE WEEKENDS" description="Calendar, session schedule, driver line-up and complete weekend results.">
        <SeasonSwitch seasons={availableSeasons} selectedSeason={selectedSeason} onSelect={season => { onSelectSeason(season); setSelectedRound(1); }} />
      </PageHero>

      <LoadState isLoading={isLoading} error={error} empty={!schedule.length} loadingLabel={'LOADING SEASON ' + selectedSeason + '…'} emptyTitle="NO RACE WEEKENDS" emptyMessage="No published calendar is available.">
        <div className="f1-race-selector">
          {schedule.map(gp => (
            <button key={gp.round} type="button" onClick={() => setSelectedRound(gp.round)} className={currentGP?.round === gp.round ? 'is-active' : ''} aria-pressed={currentGP?.round === gp.round}>
              <span>R{String(gp.round).padStart(2, '0')}</span><b>{gp.name}</b><small>{gp.date} · {gp.status}</small>
            </button>
          ))}
        </div>

        <section className="mt-4 border-y border-[#242c37] bg-[#0b0e12]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c222b]">
            <div><span className="text-[12px] tracking-[.16em] text-[var(--team-accent)]">HISTORICAL ARCHIVE</span><h2 className="text-sm font-bold text-white mt-1">PAST RACES</h2></div>
            <span className="text-[12px] text-neutral-600">{schedule.filter(g => g.status === 'COMPLETED').length} COMPLETED</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {schedule.filter(g => g.status === 'COMPLETED').map(gp => (
              <div key={gp.round} className="border-b border-r border-[#1c222b] p-3">
                <button type="button" onClick={() => setSelectedRound(gp.round)} className="w-full text-left" aria-label={'Select ' + gp.officialName}>
                  <div className="flex items-center justify-between"><span className="text-[12px] text-neutral-600">ROUND {String(gp.round).padStart(2, '0')}</span><span className="text-[12px] text-neutral-600">{gp.date}</span></div>
                  <div className="mt-1 text-[11px] font-bold text-white">{gp.name}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">{gp.circuit.name} · {gp.circuit.location}</div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setSelectedRound(gp.round); window.setTimeout(() => document.querySelector('.f1-weekend-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} className="flex-1 border border-[#2a313a] px-2 py-1 text-[12px] text-neutral-400 hover:text-white">OPEN WEEKEND</button>
                  {onReplayRace && <button type="button" onClick={() => void onReplayRace(gp)} className="border border-[var(--team-accent)] px-2 py-1 text-[12px] text-[var(--team-accent)] hover:text-white">REPLAY RACE</button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {currentGP && <section className="f1-weekend-hero" aria-label={currentGP.officialName}>
          <div className="f1-weekend-art"><div className="f1-weekend-round">ROUND {String(currentGP.round).padStart(2, '0')}</div><div className="f1-weekend-status">{statusLabel[currentGP.status]}</div><div className="f1-weekend-title">{currentGP.name}</div><div className="f1-weekend-circuit">{currentGP.circuit.name} · {currentGP.circuit.location}, {currentGP.country}</div><div className="f1-weekend-date">{currentGP.date}</div></div>
          <div className="f1-session-cards">{currentGP.sessions.map(session => <button key={session.id} type="button" onClick={() => void openSession(session)} className={'f1-session-card ' + (session.status === 'LIVE' ? 'is-live' : '')}><span>{session.type}</span><strong>{session.name}</strong><b>{session.status}</b><small>{new Date(session.startTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</small></button>)}</div>
        </section>}

        {currentGP && drivers.length > 0 && <section className="f1-lineup-panel"><div className="f1-section-title"><span>WEEKEND ENTRY LIST</span><b>{drivers.length} DRIVERS</b></div><div className="f1-lineup-grid">{teams.map(team => { const teamDrivers = drivers.filter(driver => driver.teamId === team.id); if (!teamDrivers.length) return null; return <div className="f1-lineup-team" key={team.id} style={{ '--team-card-color': team.color } as React.CSSProperties}><div><i /><b>{team.name}</b></div><div>{teamDrivers.slice(0, 2).map(driver => <span key={driver.id}>{driver.headshotUrl && <DriverHeadshot src={driver.headshotUrl} alt={driver.fullName} fallback={<span>#{driver.number}</span>} />}<strong>{driver.code}</strong></span>)}</div></div>; })}</div></section>}
        {selectedSession && sessionLoading && <div className="f1-empty-card">LOADING {selectedSession.name.toUpperCase()}…</div>}
        {selectedSession && sessionError && <div className="f1-empty-card">{sessionError}</div>}
        {selectedSession && sessionDetail && <SessionDetailPanel detail={sessionDetail} session={selectedSession} onClose={() => { setSelectedSession(null); setSessionDetail(null); }} />}
      </LoadState>
    </div>
  );
};
