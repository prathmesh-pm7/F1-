import React from 'react';
import { Circuit, DataProvenance } from '../../types/f1';
import { MapPin } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  circuits: Circuit[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
}

export const CircuitsDirectory: React.FC<Props> = ({
  circuits,
  selectedSeason,
  onSelectSeason,
  availableSeasons = [2026, 2025, 2024, 2023, 2022],
  provenance,
  isLoading,
  error
}) => {
  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Header and Season Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            FORMULA 1 CIRCUITS
          </h2>
          <span className="text-[11px] text-neutral-400">
            {circuits.length} HOST TRACKS FOR SEASON {selectedSeason}
          </span>
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">SEASON:</span>
          {availableSeasons.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => onSelectSeason(season)}
              className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                selectedSeason === season
                  ? 'bg-[#1c222b] text-white border-[#e10600]'
                  : 'bg-[#14171d] text-neutral-400 border-[#242c37] hover:text-white'
              }`}
            >
              {season}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 border border-[#242c37] bg-[#111418] text-center text-neutral-400">
          Loading season {selectedSeason} circuits...
        </div>
      ) : error ? (
        <EmptyState
          type="not-found"
          title={`SEASON ${selectedSeason} CIRCUITS UNAVAILABLE`}
          message={error}
        />
      ) : circuits.length === 0 ? (
        <EmptyState
          type="no-data"
          title={`NO CIRCUITS FOUND FOR ${selectedSeason}`}
          message="No circuit venue listings are available for this season."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {circuits.map((c) => (
              <div key={c.id} className="border border-[#242c37] bg-[#111418] overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="w-full aspect-[16/7] min-h-28 max-h-56 overflow-hidden border-b border-[#1c222b] bg-[#0a0d10] flex items-center justify-center">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.name + ' track layout'} className="w-full h-full object-contain p-3" loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('[data-circuit-image-fallback]');
                          if (fallback) fallback.classList.remove('hidden');
                        }} />
                    ) : null}
                    <div data-circuit-image-fallback className={c.imageUrl ? 'hidden text-center px-4' : 'text-center px-4'}>
                      <div className="text-[8px] tracking-[.16em] text-neutral-600">TRACK IMAGE</div>
                      <div className="mt-1 text-[10px] text-neutral-500">{c.name}</div>
                      <div className="mt-1 text-[8px] text-neutral-700">Official circuit image unavailable</div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between border-b border-[#1c222b] pb-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{c.name}</h3>
                      <div className="flex items-center gap-1.5 text-neutral-400 text-xs mt-0.5">
                        <MapPin className="w-3 h-3 text-neutral-400" />
                        <span>{c.location}, {c.country}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#161a20] border border-[#2d3744] text-[10px] font-bold text-neutral-200">
                      FIA GRADE 1
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2 text-center border-b border-[#1c222b]">
                    <div className="bg-[#14171d] p-2 border border-[#222933]">
                      <span className="text-[10px] text-neutral-400 block">LENGTH</span>
                      <span className="text-white font-bold timing-cell">
                        {c.lengthKm ? `${c.lengthKm} km` : '—'}
                      </span>
                    </div>
                    <div className="bg-[#14171d] p-2 border border-[#222933]">
                      <span className="text-[10px] text-neutral-400 block">TURNS</span>
                      <span className="text-white font-bold timing-cell">
                        {c.turns ?? '—'}
                      </span>
                    </div>
                    <div className="bg-[#14171d] p-2 border border-[#222933]">
                      <span className="text-[10px] text-neutral-400 block">DRS ZONES</span>
                      <span className="text-white font-bold timing-cell">{c.drsZones ?? '—'}</span>
                    </div>
                    <div className="bg-[#14171d] p-2 border border-[#222933]">
                      <span className="text-[10px] text-neutral-400 block">TRACK TYPE</span>
                      <span className="text-white font-bold">{c.circuitType ?? '—'}</span>
                    </div>
                  </div>
                </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-b border-[#1c222b]">
                    <div><span className="text-[9px] text-neutral-600 block">CIRCUIT RECORD</span><span className="text-white font-bold timing-cell">{c.lapRecord?.time ?? "—"}</span></div>
                    <div className="text-right"><span className="text-[9px] text-neutral-600 block">RECORD HOLDER</span><span className="text-neutral-300">{c.lapRecord ? c.lapRecord.driver + " · " + c.lapRecord.year : "No verified record loaded"}</span></div>
                  </div>

              </div>
            ))}
          </div>

          {/* Provenance */}
        </>
      )}
    </div>
  );
};
