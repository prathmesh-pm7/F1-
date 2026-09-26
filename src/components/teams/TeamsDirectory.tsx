import React, { useState } from 'react';
import { Team, Driver, DataProvenance } from '../../types/f1';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  teams: Team[];
  drivers?: Driver[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
  favoriteTeamId?: string | null;
  onSelectFavorite?: (teamId: string | null) => void;
}

export const TeamsDirectory: React.FC<Props> = ({
  teams, drivers = [], selectedSeason, onSelectSeason, availableSeasons = [2026, 2025, 2024, 2023, 2022],
  provenance, isLoading, error, favoriteTeamId, onSelectFavorite
}) => {
  const favorite = teams.find(team => team.id === favoriteTeamId) ?? null;
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <div className="text-[9px] text-neutral-500 tracking-[.14em]">CONSTRUCTORS / {selectedSeason}</div>
          <h2 className="mt-1 text-base font-bold tracking-tight text-white">TEAM DIRECTORY</h2>
          <p className="mt-1 text-[10px] text-neutral-500">Choose a team to make its colour and data the centre of your workspace.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {availableSeasons.map(season => (
            <button key={season} type="button" onClick={() => onSelectSeason(season)}
              className={`px-2.5 py-1 text-[9px] font-bold border ${selectedSeason === season ? 'bg-[#171b20] text-white border-[var(--team-accent)]' : 'bg-[#0f1216] text-neutral-500 border-[#242c37] hover:text-white'}`}>
              {season}
            </button>
          ))}
        </div>
      </div>

      {favorite && (
        <section className="border border-[#242c37] border-l-[3px] bg-[#0d1014] p-3" style={{ borderLeftColor: favorite.color }}>
          <div className="text-[8px] tracking-[.14em]" style={{ color: favorite.color }}>FOLLOWING TEAM</div>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-base font-bold text-white">{favorite.name}</div>
              <div className="mt-1 text-[9px] text-neutral-500">{favorite.fullName} · {favorite.powerUnit}</div>
            </div>
            <div className="flex gap-5">
              <span><b className="block text-[8px] text-neutral-600">POS</b><strong>P{favorite.position ?? '—'}</strong></span>
              <span><b className="block text-[8px] text-neutral-600">POINTS</b><strong>{favorite.points ?? '—'}</strong></span>
              <span><b className="block text-[8px] text-neutral-600">WINS</b><strong>{favorite.wins ?? 0}</strong></span>
              <span><b className="block text-[8px] text-neutral-600">DRIVERS</b><strong>{favorite.drivers?.join(' / ') || '—'}</strong></span>
            </div>
          </div>
        </section>
      )}

      {isLoading ? <div className="p-8 border border-[#242c37] bg-[#0f1216] text-center text-neutral-500">Loading season {selectedSeason} constructors…</div> :
       error ? <EmptyState type="not-found" title={`SEASON ${selectedSeason} CONSTRUCTORS UNAVAILABLE`} message={error} /> :
       teams.length === 0 ? <EmptyState type="no-data" title={`NO CONSTRUCTORS LISTED FOR ${selectedSeason}`} message="No constructor standings are available from the selected provider." /> : (
        <div className="border-y border-[#242c37]">
          <div className="grid grid-cols-[46px_minmax(170px,1.3fr)_110px_90px_90px_150px] gap-0 px-3 h-8 items-center bg-[#0b0e11] text-[8px] tracking-[.1em] text-neutral-600">
            <span>POS</span><span>TEAM</span><span>POINTS</span><span>WINS</span><span>DRIVERS</span><span className="text-right">FOLLOW</span>
          </div>
          {teams.map(team => {
            const followed = team.id === favoriteTeamId;
            return (
              <div key={team.id} onClick={() => setSelectedTeam(team)} className={`grid grid-cols-[46px_minmax(170px,1.3fr)_110px_90px_90px_150px] gap-0 px-3 min-h-12 items-center border-t border-[#1a1f25] hover:bg-[#11151a] cursor-pointer ${followed ? 'bg-[#11151a]' : ''}`}>
                <span className="text-neutral-500 timing-cell">P{team.position ?? '—'}</span>
                <span className="flex items-center gap-2 text-white font-bold">
                  <i className="w-1.5 h-5" style={{ backgroundColor: team.color }} />
                  {team.name}
                </span>
                <span className="timing-cell text-neutral-200">{team.points ?? '—'}</span>
                <span className="timing-cell text-neutral-300">{team.wins ?? 0}</span>
                <span className="timing-cell text-neutral-400">{team.drivers?.join(' / ') || '—'}</span>
                <span className="text-right">
                  <button type="button" onClick={() => onSelectFavorite?.(followed ? null : team.id)}
                    className="px-2 py-1 border border-[#2a313a] text-[8px] tracking-[.08em] text-neutral-500 hover:text-white hover:border-[var(--team-accent)]">
                    {followed ? 'FOLLOWING' : 'FOLLOW'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selectedTeam && (
        <section className="border border-[#2e3744] bg-[#111418] p-4">
          <div className="flex items-start justify-between border-b border-[#242c37] pb-3 mb-4">
            <div><div className="text-[8px] tracking-[.15em]" style={{color:selectedTeam.color}}>TEAM PROFILE</div><h3 className="mt-1 text-lg font-black text-white">{selectedTeam.fullName}</h3><div className="mt-1 text-[9px] text-neutral-500">{selectedTeam.powerUnit} · {selectedTeam.base}</div></div>
            <button type="button" onClick={() => setSelectedTeam(null)} className="px-2 py-1 border border-[#2a313a] text-[8px] text-neutral-500 hover:text-white">CLOSE</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drivers.filter(d => selectedTeam.drivers?.includes(d.code)).map(d => (
              <div key={d.id} className="border border-[#242c37] bg-[#0d1014] flex items-center gap-4 p-3">
                {d.headshotUrl ? <img src={d.headshotUrl} alt={d.fullName} className="w-24 h-24 object-contain object-bottom bg-[#090b0e]" loading="lazy" /> : <div className="w-24 h-24 bg-[#151a20]" />}
                <div><div className="text-[8px] text-neutral-600">DRIVER / {d.code}</div><div className="mt-1 text-sm font-bold text-white">{d.fullName}</div><div className="mt-1 text-[9px] text-neutral-500">#{d.number} · {d.nationality || '—'}</div><div className="mt-2 text-[9px] text-neutral-400">{d.points ?? 0} PTS · {d.wins ?? 0} WINS</div></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};