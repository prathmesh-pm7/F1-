import React from 'react';
import { Team, DataProvenance } from '../../types/f1';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  teams: Team[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
}

export const TeamsDirectory: React.FC<Props> = ({
  teams,
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
            FORMULA 1 CONSTRUCTORS & TECHNICAL SPECS
          </h2>
          <span className="text-[11px] text-neutral-400">
            {teams.length} CONSTRUCTORS REGISTERED FOR SEASON {selectedSeason}
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
          Loading season {selectedSeason} constructors...
        </div>
      ) : error ? (
        <EmptyState
          type="not-found"
          title={`SEASON ${selectedSeason} CONSTRUCTORS UNAVAILABLE`}
          message={error}
        />
      ) : teams.length === 0 ? (
        <EmptyState
          type="no-data"
          title={`NO CONSTRUCTORS LISTED FOR ${selectedSeason}`}
          message="Constructor team entries have not been published for this season yet."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="border border-[#242c37] bg-[#111418] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#1c222b] pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-5 inline-block"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-base font-black text-white tracking-wide">
                        {team.name}
                      </span>
                    </div>
                    {team.position && (
                      <span className="text-xs font-bold text-amber-400 timing-cell">
                        RANK P{team.position}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">FULL ENTRY NAME:</span>
                      <span className="text-neutral-200 text-right">{team.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">POWER UNIT:</span>
                      <span className="text-white font-semibold">{team.powerUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">OPERATIONAL BASE:</span>
                      <span className="text-neutral-300">{team.base}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1c222b] flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    POINTS: <strong className="text-white timing-cell">{team.points ?? 0} PTS</strong>
                  </span>
                  <span className="text-amber-400 font-bold timing-cell">
                    {team.wins ?? 0} WINS
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Provenance */}
          {provenance && <ProvenanceBadge provenance={provenance} />}
        </>
      )}
    </div>
  );
};
