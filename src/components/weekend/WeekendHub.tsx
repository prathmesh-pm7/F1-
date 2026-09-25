import React, { useEffect, useMemo, useState } from 'react';
import { GrandPrix, DataProvenance } from '../../types/f1';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  schedule: GrandPrix[];
  selectedSeason: number;
  onSelectSeason: (season: number) => void;
  availableSeasons?: number[];
  provenance?: DataProvenance;
  isLoading?: boolean;
  error?: string | null;
}

const statusLabel: Record<GrandPrix['status'], string> = {
  COMPLETED: 'COMPLETED',
  CURRENT: 'CURRENT',
  UPCOMING: 'UPCOMING'
};

export const WeekendHub: React.FC<Props> = ({
  schedule, selectedSeason, onSelectSeason, availableSeasons = [2026, 2025, 2024, 2023, 2022],
  provenance, isLoading, error
}) => {
  const firstRound = useMemo(() => schedule.find(gp => gp.status === 'CURRENT')?.round ?? schedule.find(gp => gp.status === 'UPCOMING')?.round ?? schedule[0]?.round ?? 1, [schedule]);
  const [selectedRound, setSelectedRound] = useState<number>(firstRound);
  useEffect(() => { setSelectedRound(firstRound); }, [firstRound]);
  const currentGP = schedule.find(s => s.round === selectedRound) ?? schedule.find(s => s.status === 'CURRENT') ?? schedule.find(s => s.status === 'UPCOMING') ?? schedule[0];

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <div className="text-[9px] text-neutral-500 tracking-[.14em]">SEASON / {selectedSeason}</div>
          <h2 className="mt-1 text-base font-bold text-white">RACE WEEKENDS</h2>
          <p className="mt-1 text-[10px] text-neutral-500">Calendar and session status derived from the published session timestamps.</p>
        </div>
        <div className="flex gap-1.5">
          {availableSeasons.map(season => <button key={season} type="button" onClick={() => { onSelectSeason(season); setSelectedRound(1); }}
            className={`px-2.5 py-1 text-[9px] border ${selectedSeason === season ? 'text-white border-[var(--team-accent)] bg-[#171b20]' : 'text-neutral-500 border-[#242c37] bg-[#0f1216] hover:text-white'}`}>{season}</button>)}
        </div>
      </div>

      {isLoading ? <div className="p-8 border border-[#242c37] text-center text-neutral-500">Loading season {selectedSeason}…</div> :
       error ? <EmptyState type="not-found" title={`SEASON ${selectedSeason} DATA UNAVAILABLE`} message={error} /> :
       schedule.length === 0 ? <EmptyState type="no-data" title={`NO SCHEDULE FOR ${selectedSeason}`} message="The selected provider has not returned a published calendar." /> : (
        <>
          <div className="border-y border-[#242c37] overflow-x-auto">
            <div className="min-w-max grid grid-flow-col auto-cols-[132px]">
              {schedule.map(gp => (
                <button key={gp.round} type="button" onClick={() => setSelectedRound(gp.round)}
                  className={`text-left px-3 py-2 border-r border-[#1a1f25] ${currentGP?.round === gp.round ? 'bg-[#15191e] text-white border-t-2 border-t-[var(--team-accent)]' : 'text-neutral-500 hover:bg-[#101419]'}`}>
                  <div className="flex justify-between text-[8px]"><span>R{String(gp.round).padStart(2,'0')}</span><span>{statusLabel[gp.status]}</span></div>
                  <div className="mt-1 text-[10px] font-bold truncate">{gp.name}</div>
                  <div className="mt-1 text-[8px] text-neutral-600">{gp.date}</div>
                </button>
              ))}
            </div>
          </div>

          {currentGP && (
            <section className="border-y border-[#242c37] bg-[#0d1014]">
              <div className="grid grid-cols-[1fr_auto] gap-5 p-4 border-b border-[#1a1f25]">
                <div>
                  <div className="text-[8px] tracking-[.14em] text-neutral-600">ROUND {currentGP.round} / {schedule.length} · {currentGP.status}</div>
                  <h2 className="mt-1 text-lg font-bold text-white">{currentGP.officialName}</h2>
                  <div className="mt-1 text-[10px] text-neutral-500">{currentGP.circuit.name} · {currentGP.circuit.location}, {currentGP.country}</div>
                </div>
                <div className="text-right text-[9px] text-neutral-500"><div>EVENT DATE</div><strong className="block mt-1 text-white">{currentGP.date}</strong></div>
              </div>

              <div className="divide-y divide-[#1a1f25]">
                {currentGP.sessions.map(session => (
                  <div key={session.id} className="grid grid-cols-[90px_1fr_110px_90px] items-center gap-3 px-4 py-3">
                    <span className="text-[9px] text-neutral-500">{session.type}</span>
                    <span className="text-[10px] text-neutral-200 font-semibold">{session.name}</span>
                    <span className={`text-[8px] tracking-[.08em] ${session.status === 'LIVE' ? 'text-[var(--team-accent)]' : session.status === 'COMPLETED' ? 'text-neutral-500' : 'text-neutral-300'}`}>{session.status}</span>
                    <span className="text-right text-[9px] text-neutral-600">{new Date(session.startTime).toLocaleString([], { weekday:'short', hour:'2-digit', minute:'2-digit', timeZoneName:'short' })}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};