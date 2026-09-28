import React, { useState } from 'react';
import { DriverStanding, ConstructorStanding, DataProvenance } from '../../types/f1';
import { PageHero } from '../shared/PageHero';
import { SeasonSwitch } from '../shared/SeasonSwitch';
import { LoadState } from '../shared/LoadState';

interface Props { driverStandings: DriverStanding[]; constructorStandings: ConstructorStanding[]; selectedSeason: number; onSelectSeason: (season: number) => void; availableSeasons?: number[]; provenance?: DataProvenance; isLoading?: boolean; error?: string | null; }

export const StandingsWorkstation: React.FC<Props> = ({ driverStandings, constructorStandings, selectedSeason, onSelectSeason, availableSeasons = [], isLoading, error }) => {
  const [tab, setTab] = useState<'drivers' | 'constructors'>('drivers');
  const rows: any[] = tab === 'drivers' ? driverStandings : constructorStandings;
  return (
    <div className="f1-info-page">
      <PageHero kicker="CHAMPIONSHIP" title="STANDINGS" description="Championship order, points, wins and gap to the leader."><SeasonSwitch seasons={availableSeasons} selectedSeason={selectedSeason} onSelect={onSelectSeason} /></PageHero>
      <div className="f1-tabs"><button type="button" className={tab === 'drivers' ? 'is-active' : ''} onClick={() => setTab('drivers')} aria-pressed={tab === 'drivers'}>DRIVERS</button><button type="button" className={tab === 'constructors' ? 'is-active' : ''} onClick={() => setTab('constructors')} aria-pressed={tab === 'constructors'}>CONSTRUCTORS</button></div>
      <LoadState isLoading={isLoading} error={error} empty={!rows.length} loadingLabel={'LOADING ' + selectedSeason + ' CHAMPIONSHIP…'} emptyTitle="NO POINTS RECORDED" emptyMessage="No championship classification is available.">
        <>
          <div className="f1-podium-strip">{rows.slice(0, 3).map((row, index) => { const person = tab === 'drivers' ? row.driver : row.team; return <div key={person.id} className={'f1-podium-card p' + (index + 1)} style={{ '--podium-color': person.color || row.driver?.teamColor || row.team?.color } as React.CSSProperties}><span>P{index + 1}</span><strong>{tab === 'drivers' ? row.driver.code : row.team.name}</strong><b>{row.points}</b><small>POINTS</small></div>; })}</div>
          <div className="f1-standing-list">{rows.map((row, index) => { const name = tab === 'drivers' ? row.driver.fullName : row.team.name; const code = tab === 'drivers' ? row.driver.code : row.team.name; const color = tab === 'drivers' ? row.driver.teamColor : row.team.color; return <div key={tab === 'drivers' ? row.driver.id : row.team.id} className="f1-standing-row"><span className="f1-standing-pos">{String(row.position ?? index + 1).padStart(2, '0')}</span><span className="f1-standing-accent" style={{ background: color }} /><div className="f1-standing-person">{tab === 'drivers' && row.driver.headshotUrl ? <img src={row.driver.headshotUrl} alt={row.driver.fullName} loading="lazy" /> : <span className="f1-standing-avatar">{code.slice(0, 3)}</span>}<div><b>{name}</b><small>{tab === 'drivers' ? row.driver.teamName : row.team.powerUnit}</small></div></div><strong className="f1-standing-points">{row.points}</strong><span className="f1-standing-behind">{row.behindLeader === 0 ? 'LEADER' : '-' + row.behindLeader}</span><span className="f1-standing-wins">{row.wins} W</span></div>; })}</div>
        </>
      </LoadState>
    </div>
  );
};
