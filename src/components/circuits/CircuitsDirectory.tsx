import React from 'react';
import { Circuit, DataProvenance } from '../../types/f1';
import { MapPin } from 'lucide-react';
import { PageHero } from '../shared/PageHero';
import { SeasonSwitch } from '../shared/SeasonSwitch';
import { LoadState } from '../shared/LoadState';

interface Props { circuits: Circuit[]; selectedSeason: number; onSelectSeason: (season: number) => void; availableSeasons?: number[]; provenance?: DataProvenance; isLoading?: boolean; error?: string | null; }

export const CircuitsDirectory: React.FC<Props> = ({ circuits, selectedSeason, onSelectSeason, availableSeasons = [], isLoading, error }) => (
  <div className="f1-info-page">
    <PageHero kicker="FORMULA 1 CIRCUIT DIRECTORY" title="TRACKS" description="Every circuit on the selected calendar, with track facts and verified lap records."><SeasonSwitch seasons={availableSeasons} selectedSeason={selectedSeason} onSelect={onSelectSeason} /></PageHero>
    <LoadState isLoading={isLoading} error={error} empty={!circuits.length} loadingLabel="LOADING CIRCUITS…" emptyTitle="NO CIRCUITS FOUND" emptyMessage="No circuit listings are available.">
      <div className="f1-circuit-grid">{circuits.map((circuit, index) => <article key={circuit.id} className="f1-circuit-card">
        <div className="f1-circuit-image">{circuit.imageUrl ? <img src={circuit.imageUrl} alt={circuit.name} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <span>TRACK / {String(index + 1).padStart(2, '0')}</span>}<div className="f1-circuit-overlay"><b>R{String(index + 1).padStart(2, '0')}</b><span>F1</span></div></div>
        <div className="f1-circuit-body"><div className="f1-circuit-title"><div><span>{circuit.country}</span><h2>{circuit.name}</h2><p><MapPin aria-hidden="true" /> {circuit.location}</p></div><span className="f1-grade">GRADE 1</span></div><div className="f1-circuit-stats"><div><span>LENGTH</span><strong>{circuit.lengthKm ? circuit.lengthKm + ' km' : '—'}</strong></div><div><span>TURNS</span><strong>{circuit.turns ?? '—'}</strong></div><div><span>{selectedSeason >= 2026 ? 'AERO' : 'DRS'}</span><strong>{selectedSeason >= 2026 ? 'ACTIVE' : circuit.drsZones ?? '—'}</strong></div><div><span>TYPE</span><strong>{circuit.circuitType ?? '—'}</strong></div></div><div className="f1-record-card"><div><span>CIRCUIT RECORD</span><strong>{circuit.lapRecord?.time ?? '—'}</strong></div><div><span>DRIVER</span><strong>{circuit.lapRecord?.driver ?? 'Record unavailable'}</strong><small>{circuit.lapRecord?.year ?? ''}</small></div></div></div>
      </article>)}</div>
    </LoadState>
  </div>
);
