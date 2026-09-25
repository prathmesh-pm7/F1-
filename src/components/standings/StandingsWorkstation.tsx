import React, { useState } from 'react';
import { DriverStanding, ConstructorStanding } from '../../types/f1';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
}

export const StandingsWorkstation: React.FC<Props> = ({
  driverStandings,
  constructorStandings
}) => {
  const [tab, setTab] = useState<'drivers' | 'constructors'>('drivers');

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-[#242c37] pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('drivers')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
              tab === 'drivers'
                ? 'bg-[#1c222b] text-white border-b-2 border-[#e10600]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            DRIVERS CHAMPIONSHIP
          </button>
          <button
            type="button"
            onClick={() => setTab('constructors')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
              tab === 'constructors'
                ? 'bg-[#1c222b] text-white border-b-2 border-[#e10600]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            CONSTRUCTORS CHAMPIONSHIP
          </button>
        </div>

        <span className="text-[11px] text-neutral-400 hidden sm:inline">
          OFFICIAL FIA CLASSIFICATION
        </span>
      </div>

      {/* Drivers Table */}
      {tab === 'drivers' && (
        <div className="border border-[#242c37] bg-[#111418] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#242c37] bg-[#0e1115] text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <th className="py-2 px-3 text-center w-12">POS</th>
                <th className="py-2 px-3">DRIVER</th>
                <th className="py-2 px-3">TEAM</th>
                <th className="py-2 px-3 text-right">POINTS</th>
                <th className="py-2 px-3 text-right">BEHIND</th>
                <th className="py-2 px-3 text-center">WINS</th>
                <th className="py-2 px-3 text-center">CAR #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c222b]">
              {driverStandings.map((ds) => (
                <tr key={ds.driver.id} className="hover:bg-[#161a20] transition-colors">
                  <td className="py-2 px-3 text-center font-bold">
                    <span className={ds.position <= 3 ? 'text-amber-400 font-black' : 'text-neutral-300'}>
                      {String(ds.position).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1 h-3.5 inline-block shrink-0"
                        style={{ backgroundColor: ds.driver.teamColor }}
                      />
                      <span className="font-bold text-white tracking-wider">{ds.driver.code}</span>
                      <span className="text-neutral-400 hidden md:inline">{ds.driver.fullName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-neutral-300">{ds.driver.teamName}</td>
                  <td className="py-2 px-3 text-right font-bold text-white timing-cell">{ds.points}</td>
                  <td className="py-2 px-3 text-right text-neutral-400 timing-cell">
                    {ds.behindLeader === 0 ? '—' : `-${ds.behindLeader}`}
                  </td>
                  <td className="py-2 px-3 text-center timing-cell font-medium text-neutral-200">{ds.wins}</td>
                  <td className="py-2 px-3 text-center text-neutral-400 timing-cell">#{ds.driver.number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Constructors Table */}
      {tab === 'constructors' && (
        <div className="border border-[#242c37] bg-[#111418] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#242c37] bg-[#0e1115] text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <th className="py-2 px-3 text-center w-12">POS</th>
                <th className="py-2 px-3">CONSTRUCTOR</th>
                <th className="py-2 px-3">POWER UNIT</th>
                <th className="py-2 px-3 text-right">POINTS</th>
                <th className="py-2 px-3 text-right">BEHIND</th>
                <th className="py-2 px-3 text-center">WINS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c222b]">
              {constructorStandings.map((cs) => (
                <tr key={cs.team.id} className="hover:bg-[#161a20] transition-colors">
                  <td className="py-2 px-3 text-center font-bold">
                    <span className={cs.position <= 3 ? 'text-amber-400 font-black' : 'text-neutral-300'}>
                      {String(cs.position).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-3.5 inline-block shrink-0"
                        style={{ backgroundColor: cs.team.color }}
                      />
                      <span className="font-bold text-white tracking-wider">{cs.team.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-neutral-400">{cs.team.powerUnit}</td>
                  <td className="py-2 px-3 text-right font-bold text-white timing-cell">{cs.points}</td>
                  <td className="py-2 px-3 text-right text-neutral-400 timing-cell">
                    {cs.behindLeader === 0 ? '—' : `-${cs.behindLeader}`}
                  </td>
                  <td className="py-2 px-3 text-center timing-cell font-medium text-neutral-200">{cs.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'Jolpica F1',
          sourceUrl: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Formula 1 World Championship Standings'
        }}
      />
    </div>
  );
};
