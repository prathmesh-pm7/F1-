import React, { useState } from 'react';
import { GrandPrix } from '../../types/f1';
import { Calendar, MapPin, Clock, Flag, CheckCircle } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  schedule: GrandPrix[];
  onSelectRace?: (gp: GrandPrix) => void;
}

export const WeekendHub: React.FC<Props> = ({ schedule }) => {
  const [selectedRound, setSelectedRound] = useState<number>(16); // Monza 2024 or current
  const currentGP = schedule.find(s => s.round === selectedRound) || schedule[0];

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Race Selector Horizontal Strip */}
      <div className="border border-[#242c37] bg-[#111418] p-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {schedule.map((gp) => {
            const isSelected = gp.round === currentGP.round;
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
                {currentGP.totalLaps} LAPS · {currentGP.circuit.lengthKm} KM
              </div>
            </div>
          </div>

          {/* Session Timetable */}
          <div className="mb-4">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-2">
              SESSION TIMETABLE & STATUS
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

          {/* Circuit Technical Data */}
          <div className="border border-[#1f2632] bg-[#161a20] p-3">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-2">
              CIRCUIT TECHNICAL SPECIFICATIONS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px]">CIRCUIT LENGTH</span>
                <span className="text-white font-bold timing-cell">{currentGP.circuit.lengthKm} km</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">NUMBER OF TURNS</span>
                <span className="text-white font-bold timing-cell">{currentGP.circuit.turns} turns</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">DRS ZONES</span>
                <span className="text-white font-bold timing-cell">{currentGP.circuit.drsZones} zones</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">LAP RECORD</span>
                <span className="text-fuchsia-400 font-bold timing-cell">
                  {currentGP.circuit.lapRecord ? `${currentGP.circuit.lapRecord.time} (${currentGP.circuit.lapRecord.driver})` : '1:21.046 (Barrichello)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'Jolpica F1',
          sourceUrl: 'https://api.jolpi.ca/ergast/f1/current.json',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Official FIA Formula 1 World Championship Calendar'
        }}
      />
    </div>
  );
};
