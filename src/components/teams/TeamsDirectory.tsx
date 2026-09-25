import React from 'react';
import { Team } from '../../types/f1';
import { Shield } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  teams: Team[];
}

export const TeamsDirectory: React.FC<Props> = ({ teams }) => {
  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      <div className="flex items-center justify-between border-b border-[#242c37] pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          FORMULA 1 CONSTRUCTORS & TECHNICAL SPECS
        </h2>
        <span className="text-[11px] text-neutral-400">
          {teams.length} CONSTRUCTORS
        </span>
      </div>

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
      <ProvenanceBadge
        provenance={{
          provider: 'Jolpica F1',
          sourceUrl: 'https://api.jolpi.ca/ergast/f1/current/constructors.json',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Official FIA Formula 1 Constructor Specifications'
        }}
      />
    </div>
  );
};
