import React, { useState } from 'react';
import { Team, Driver, DataProvenance } from '../../types/f1';
import { EmptyState } from '../shared/EmptyState';
import { Star, X } from 'lucide-react';
import { PageHero } from '../shared/PageHero';
import { SeasonSwitch } from '../shared/SeasonSwitch';
import { LoadState } from '../shared/LoadState';
import { DriverHeadshot } from '../shared/DriverHeadshot';

interface Props { teams: Team[]; drivers?: Driver[]; selectedSeason: number; onSelectSeason: (season: number) => void; availableSeasons?: number[]; provenance?: DataProvenance; isLoading?: boolean; error?: string | null; favoriteTeamId?: string | null; onSelectFavorite?: (teamId: string | null) => void; }

export const TeamsDirectory: React.FC<Props> = ({ teams, drivers = [], selectedSeason, onSelectSeason, availableSeasons = [], isLoading, error, favoriteTeamId, onSelectFavorite }) => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  return (
    <div className="f1-info-page">
      <PageHero kicker="FORMULA 1 WORLD CHAMPIONSHIP" title="TEAMS" description="Constructors, drivers, cars and championship position."><SeasonSwitch seasons={availableSeasons} selectedSeason={selectedSeason} onSelect={onSelectSeason} /></PageHero>
      <LoadState isLoading={isLoading} error={error} empty={!teams.length} loadingLabel="LOADING CONSTRUCTOR DATA…" emptyTitle="NO CONSTRUCTORS" emptyMessage="No constructor standings are available.">
        <div className="f1-team-grid">{teams.map((team, index) => { const teamDrivers = drivers.filter(driver => team.drivers?.includes(driver.code)); const followed = team.id === favoriteTeamId; return <article key={team.id} className={'f1-team-card ' + (followed ? 'is-followed' : '')} style={{ '--team-card-color': team.color } as React.CSSProperties} role="button" tabIndex={0} aria-expanded={selectedTeam?.id === team.id} aria-label={team.name + ' constructor profile'} onClick={() => setSelectedTeam(team)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTeam(team); } }}>
          <div className="f1-team-card-accent" /><div className="f1-team-card-head"><span>P{team.position ?? index + 1}</span><button type="button" aria-label={(followed ? 'Remove ' : 'Set ') + team.name + ' as favorite'} aria-pressed={followed} onClick={event => { event.stopPropagation(); onSelectFavorite?.(followed ? null : team.id); }}><Star fill={followed ? 'currentColor' : 'none'} /></button></div>
          <div className="f1-team-card-title"><span>{team.powerUnit}</span><h2>{team.name}</h2><p>{team.chassis ?? 'CAR —'}</p></div>
          <div className="f1-team-drivers">{teamDrivers.slice(0, 2).map(driver => <div key={driver.id}>{driver.headshotUrl ? <DriverHeadshot src={driver.headshotUrl} alt={driver.fullName} fallback={<span />} /> : <span />}<b>{driver.code}</b></div>)}</div>
          <div className="f1-team-card-stats"><div><span>POINTS</span><strong>{team.points ?? 0}</strong></div><div><span>WINS</span><strong>{team.wins ?? 0}</strong></div><div><span>DRIVERS</span><strong>{teamDrivers.length || team.drivers?.length || 0}</strong></div></div>
        </article>; })}</div>
      </LoadState>
      {selectedTeam && <section className="f1-team-profile" style={{ '--team-card-color': selectedTeam.color } as React.CSSProperties}><div className="f1-profile-topline"><span style={{ color: selectedTeam.color }}>CONSTRUCTOR PROFILE</span><button type="button" aria-label={'Close ' + selectedTeam.name + ' profile'} onClick={() => setSelectedTeam(null)}><X /></button></div><div className="f1-team-profile-hero"><div className="f1-team-profile-mark" style={{ background: selectedTeam.color }} /><div><span>{selectedTeam.powerUnit}</span><h2>{selectedTeam.fullName}</h2><p>{selectedTeam.chassis ?? 'CAR —'} · {selectedTeam.base}</p></div><div className="f1-profile-big-stat"><strong>P{selectedTeam.position ?? '—'}</strong><span>CHAMPIONSHIP</span></div></div><div className="f1-stat-grid"><div><span>POINTS</span><strong>{selectedTeam.points ?? 0}</strong></div><div><span>WINS</span><strong>{selectedTeam.wins ?? 0}</strong></div><div><span>DRIVERS</span><strong>{selectedTeam.drivers?.join(' / ') || '—'}</strong></div><div><span>POWER UNIT</span><strong>{selectedTeam.powerUnit}</strong></div></div><div className="f1-team-profile-drivers">{drivers.filter(driver => selectedTeam.drivers?.includes(driver.code)).map(driver => <div key={driver.id}>{driver.headshotUrl && <img src={driver.headshotUrl} alt={driver.fullName} loading="lazy" />}<div><b>{driver.fullName}</b><span>#{driver.number} · {driver.code}</span></div></div>)}</div></section>}
    </div>
  );
};
