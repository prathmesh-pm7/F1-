import React, { useState } from 'react';
import { Driver, DataProvenance } from '../../types/f1';
import { Search } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  drivers: Driver[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
}

export const DriversDirectory: React.FC<Props> = ({
  drivers,
  selectedSeason,
  onSelectSeason,
  availableSeasons = [2026, 2025, 2024, 2023, 2022],
  provenance,
  isLoading,
  error
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const filtered = drivers.filter(d =>
    d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(d.number).includes(searchTerm)
  );

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Search and Season Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search driver by name, code or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111418] border border-[#2d3744] pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-300 w-64"
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-neutral-500 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">SEASON:</span>
          {availableSeasons.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => {
                onSelectSeason(season);
                setSelectedDriver(null);
              }}
              className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                selectedSeason === season
                  ? 'bg-[#1c222b] text-white border-[var(--team-accent)]'
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
          Loading season {selectedSeason} drivers...
        </div>
      ) : error ? (
        <EmptyState
          type="not-found"
          title={`SEASON ${selectedSeason} DRIVERS UNAVAILABLE`}
          message={error}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          type="no-data"
          title={`NO DRIVERS FOUND`}
          message={`No registered drivers matched your criteria for season ${selectedSeason}.`}
        />
      ) : (
        <>
          {/* Directory Table + inline driver profiles */}
          <div className="border border-[#242c37] bg-[#111418] overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#242c37] bg-[#0e1115] text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <th className="py-2 px-3 text-center w-12">#</th>
                  <th className="py-2 px-3">DRIVER</th>
                  <th className="py-2 px-3">CODE</th>
                  <th className="py-2 px-3">TEAM / CAR</th>
                  <th className="py-2 px-3 text-right">POINTS</th>
                  <th className="py-2 px-3 text-center">WINS</th>
                  <th className="py-2 px-3 text-center">CHAMP POS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c222b]">
                {filtered.map((drv) => (
                  <React.Fragment key={drv.id}>
                    <tr
                      onClick={() => setSelectedDriver(selectedDriver?.id === drv.id ? null : drv)}
                      className={`hover:bg-[#161a20] cursor-pointer transition-colors ${selectedDriver?.id === drv.id ? 'bg-[#151a20]' : ''}`}
                    >
                      <td className="py-2 px-3 text-center text-neutral-400 font-bold timing-cell">{drv.number ? `#${drv.number}` : '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-3.5 inline-block shrink-0" style={{ backgroundColor: drv.teamColor }} />
                          <span className="font-bold text-white tracking-wide">{drv.fullName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-bold text-neutral-300">{drv.code}</td>
                      <td className="py-2 px-3 text-neutral-300"><div>{drv.teamName}</div><div className="text-[9px] text-neutral-600">{drv.chassis ?? '—'}</div></td>
                      <td className="py-2 px-3 text-right font-bold text-white timing-cell">{drv.points ?? 0}</td>
                      <td className="py-2 px-3 text-center text-neutral-200 timing-cell">{drv.wins ?? 0}</td>
                      <td className="py-2 px-3 text-center font-bold text-neutral-300 timing-cell">{drv.championshipPosition ? `P${drv.championshipPosition}` : '—'}</td>
                    </tr>
                    {selectedDriver?.id === drv.id && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="border-t border-[#2e3744] bg-[#0d1014] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3 mb-3">
                              <div className="flex items-center gap-3">
                                {drv.headshotUrl ? (
                                  <img src={drv.headshotUrl} alt={drv.fullName} className="w-20 h-20 object-contain object-bottom border border-[#242c37] bg-[#090b0e]" loading="lazy" />
                                ) : (
                                  <div className="w-20 h-20 border border-[#242c37] bg-[#151a20] flex items-end">
                                    <span className="w-full h-1" style={{ backgroundColor: drv.teamColor }} />
                                  </div>
                                )}
                                <div>
                                  <div className="text-[8px] tracking-[.15em] text-neutral-600">DRIVER PROFILE / {drv.code}</div>
                                  <h3 className="mt-1 text-base font-black text-white">{drv.fullName} <span className="text-neutral-500">#{drv.number}</span></h3>
                                  <div className="mt-1 text-[10px] text-neutral-400">{drv.teamName} · {drv.chassis ?? 'CAR —'} · {drv.nationality || '—'}</div>
                                </div>
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedDriver(null); }} className="px-2 py-1 border border-[#2a313a] text-[8px] text-neutral-500 hover:text-white">CLOSE</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="border border-[#222933] bg-[#111418] p-2"><span className="text-[8px] text-neutral-600">CHAMPIONSHIP</span><strong className="block mt-1 text-white timing-cell">{drv.championshipPosition ? `P${drv.championshipPosition}` : '—'}</strong></div>
                              <div className="border border-[#222933] bg-[#111418] p-2"><span className="text-[8px] text-neutral-600">POINTS</span><strong className="block mt-1 text-white timing-cell">{drv.points ?? 0}</strong></div>
                              <div className="border border-[#222933] bg-[#111418] p-2"><span className="text-[8px] text-neutral-600">WINS</span><strong className="block mt-1 text-white timing-cell">{drv.wins ?? 0}</strong></div>
                              <div className="border border-[#222933] bg-[#111418] p-2"><span className="text-[8px] text-neutral-600">PODIUMS</span><strong className="block mt-1 text-white timing-cell">{drv.podiums ?? 0}</strong></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Provenance */}
        </>
      )}
    </div>
  );
};
