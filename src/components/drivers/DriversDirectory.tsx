import React, { useState } from 'react';
import { Driver, DataProvenance } from '../../types/f1';
import { Search, X } from 'lucide-react';
import { PageHero } from '../shared/PageHero';
import { SeasonSwitch } from '../shared/SeasonSwitch';
import { LoadState } from '../shared/LoadState';
import { DriverHeadshot } from '../shared/DriverHeadshot';

interface Props { drivers: Driver[]; selectedSeason: number; onSelectSeason: (season: number) => void; availableSeasons?: number[]; provenance?: DataProvenance; isLoading?: boolean; error?: string | null; }

export const DriversDirectory: React.FC<Props> = ({ drivers, selectedSeason, onSelectSeason, availableSeasons = [], isLoading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const filtered = drivers.filter(driver => [driver.fullName, driver.code, driver.teamName, String(driver.number)].some(value => value.toLowerCase().includes(searchTerm.toLowerCase())));
  return (
    <div className="f1-info-page">
      <PageHero kicker="FORMULA 1 WORLD CHAMPIONSHIP" title="DRIVERS" description="Driver profiles, championship numbers and current team information."><SeasonSwitch seasons={availableSeasons} selectedSeason={selectedSeason} onSelect={season => { onSelectSeason(season); setSelectedDriver(null); }} /></PageHero>
      <div className="f1-filterbar"><div className="f1-search-field"><Search aria-hidden="true" /><input aria-label="Search drivers" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="SEARCH DRIVER, CODE OR NUMBER" /></div><span>{filtered.length} DRIVERS</span></div>
      <LoadState isLoading={isLoading} error={error} empty={!filtered.length} loadingLabel="LOADING DRIVER DATA…" emptyTitle="NO DRIVERS FOUND" emptyMessage="No driver matched your search.">
        <div className="f1-driver-grid">{filtered.map((driver, index) => { const selected = selectedDriver?.id === driver.id; return <React.Fragment key={driver.id}>
          <article className={'f1-driver-card ' + (selected ? 'is-selected' : '')} style={{ '--driver-accent': driver.teamColor } as React.CSSProperties} role="button" tabIndex={0} aria-expanded={selected} aria-label={driver.fullName + ' driver profile'} onClick={() => setSelectedDriver(selected ? null : driver)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDriver(selected ? null : driver); } }}>
            <div className="f1-driver-card-top"><span className="f1-driver-pos">{String(driver.championshipPosition ?? index + 1).padStart(2, '0')}</span><span className="f1-driver-code">{driver.code}</span></div>
            <div className="f1-driver-image-wrap">{driver.headshotUrl ? <DriverHeadshot src={driver.headshotUrl} alt={driver.fullName} className="f1-driver-image" fallback={<div className="f1-driver-image-placeholder">#{driver.number}</div>} /> : <div className="f1-driver-image-placeholder">#{driver.number}</div>}<span className="f1-driver-number">{driver.number ? '#' + driver.number : '—'}</span></div>
            <div className="f1-driver-card-bottom"><div><span className="f1-driver-team">{driver.teamName}</span><h2>{driver.fullName}</h2><span className="f1-driver-car">{driver.chassis ?? 'CAR —'}</span></div><div className="f1-driver-points"><strong>{driver.points ?? 0}</strong><span>PTS</span></div></div>
          </article>
          {selected && <section className="f1-profile-panel"><div className="f1-profile-visual">{driver.headshotUrl ? <DriverHeadshot src={driver.headshotUrl} alt={driver.fullName} fallback={<span>#{driver.number}</span>} /> : <span>#{driver.number}</span>}</div><div className="f1-profile-main"><div className="f1-profile-topline"><span style={{ color: driver.teamColor }}>DRIVER PROFILE / {driver.code}</span><button type="button" aria-label={'Close ' + driver.fullName + ' profile'} onClick={event => { event.stopPropagation(); setSelectedDriver(null); }}><X /></button></div><h2>{driver.fullName}</h2><p>{driver.teamName} · {driver.chassis ?? 'CAR —'} · {driver.nationality || 'Nationality unavailable'} · #{driver.number || '—'}</p><div className="f1-stat-grid"><div><span>CHAMPIONSHIP</span><strong>P{driver.championshipPosition ?? '—'}</strong></div><div><span>POINTS</span><strong>{driver.points ?? 0}</strong></div><div><span>SEASON WINS</span><strong>{driver.wins ?? 0}</strong></div><div><span>SEASON PODIUMS</span><strong>{driver.podiums ?? '—'}</strong></div><div><span>DATE OF BIRTH</span><strong>{driver.dateOfBirth ? new Date(driver.dateOfBirth).toLocaleDateString('en-GB') : '—'}</strong></div><div><span>PERMANENT NO.</span><strong>#{driver.permanentNumber ?? driver.number ?? '—'}</strong></div><div><span>CAREER STARTS</span><strong>{driver.careerStarts ?? '—'}</strong></div><div><span>CAREER POLES</span><strong>{driver.careerPoles ?? '—'}</strong></div></div><div className="f1-driver-detail-grid"><div><span>FULL NAME</span><b>{driver.fullName}</b></div><div><span>NATIONALITY</span><b>{driver.nationality || '—'}</b></div><div><span>TEAM</span><b>{driver.teamName}</b></div><div><span>CHASSIS</span><b>{driver.chassis ?? '—'}</b></div></div></div></section>}
        </React.Fragment>; })}</div>
      </LoadState>
    </div>
  );
};
