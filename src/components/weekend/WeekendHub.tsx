import React, { useState } from 'react';
import { GrandPrix, DataProvenance } from '../../types/f1';
import { Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';
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

export const WeekendHub: React.FC<Props> = ({
  schedule,
  selectedSeason,
  onSelectSeason,
  availableSeasons = [2026, 2025, 2024, 2023, 2022],
  provenance,
  isLoading,
  error
}) => {
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const currentGP = schedule.find(s => s.round === selectedRound) || schedule[0];

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Header with Season Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            FORMULA 1 CALENDAR & RACE SESSIONS
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Official FIA World Championship Grand Prix timetable & circuit technical specifications
          </p>
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
                setSelectedRound(1);
              }}
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
          Loading season {selectedSeason} calendar...
        </div>
      ) : error ? (
        <EmptyState
          type="not-found"
          title={`SEASON ${selectedSeason} DATA UNAVAILABLE`}
          message={error}
        />
      ) : schedule.length === 0 ? (
        <EmptyState
          type="no-data"
          title={`NO SESSIONS PUBLISHED FOR ${selectedSeason}`}
          message="The official FIA calendar for this season has not been published yet or is awaiting confirmation."
        />
      ) : (
        <>
          {/* Race Selector Horizontal Strip */}
          <div className="border border-[#242c37] bg-[#111418] p-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {schedule.map((gp) => {
                const isSelected = currentGP && gp.round === currentGP.round;
                return (
                  <button
                    key={gp.round}
                    type="button"
                    onClick={() => setSelectedRound(gp.round)}
                    className={`px-3 py-1.5 text-left border transition-colors ${
                      isSelected
                        ? 'bg-[#1c222b] border-[#e10600] text-white font-bold'
                        : 'bg-[#14171d] border-[#222933] text-neutral-400 hover:text-neutral-200 hover:border-[#333d4d]'
                    }`}
                  >
                    <div className="text-[9px] text-neutral-400">R{String(gp.round).padStart(2, '0')}</div>
                    <div className="text-xs font-bold truncate max-w-[100px]">{gp.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Grand Prix Card */}
          {currentGP && (
            <div className="border border-[#242c37] bg-[#111418] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#242c37] pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                    <span>ROUND {currentGP.round} OF {schedule.length}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-emerald-400 font-semibold">{currentGP.country.toUpperCase()}</span>
                    {currentGP.isSprintWeekend && (
                      <>
                        <span className="text-neutral-600">·</span>
                        <span className="text-amber-400 font-bold">SPRINT WEEKEND</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {currentGP.officialName}
                  </h2>
                  <div className="flex items-center gap-2 text-neutral-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{currentGP.circuit.name}, {currentGP.circuit.location}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-neutral-400">EVENT DATE</div>
                  <div className="text-sm font-bold text-white timing-cell">{currentGP.date}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    SEASON {currentGP.season}
                  </div>
                </div>
              </div>

              {/* Session Timetable */}
              <div className="mb-4">
                <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-2">
                  SESSION TIMETABLE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {currentGP.sessions.map((sess) => (
                    <div key={sess.id} className="border border-[#1f2632] bg-[#161a20] p-3">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                        <span className="font-bold uppercase">{sess.type}</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{sess.status}</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white">{sess.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1 timing-cell">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Provenance */}
          {provenance && <ProvenanceBadge provenance={provenance} />}
        </>
      )}
    </div>
  );
};
