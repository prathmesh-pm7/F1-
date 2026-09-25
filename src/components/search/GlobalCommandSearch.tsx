import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Shield, MapPin, Calendar, FileText, Wrench } from 'lucide-react';
import { Driver, Team, Circuit, GrandPrix, FIADocument, TechnicalUpdate } from '../../types/f1';
import { NavTab } from '../layout/Sidebar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  drivers: Driver[];
  teams: Team[];
  circuits: Circuit[];
  schedule: GrandPrix[];
  documents: FIADocument[];
  technical: TechnicalUpdate[];
}

export const GlobalCommandSearch: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigate,
  drivers,
  teams,
  circuits,
  schedule,
  documents,
  technical
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedDrivers = q ? drivers.filter(d => d.fullName.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || String(d.number) === q).slice(0, 3) : [];
  const matchedTeams = q ? teams.filter(t => t.name.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q)).slice(0, 2) : [];
  const matchedCircuits = q ? circuits.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 2) : [];
  const matchedRaces = q ? schedule.filter(r => r.name.toLowerCase().includes(q) || r.country.toLowerCase().includes(q)).slice(0, 2) : [];
  const matchedDocs = q ? documents.filter(d => d.title.toLowerCase().includes(q) || String(d.docNumber) === q).slice(0, 2) : [];
  const matchedTech = q ? technical.filter(t => t.team.toLowerCase().includes(q) || t.component.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)).slice(0, 2) : [];

  const hasResults =
    matchedDrivers.length > 0 ||
    matchedTeams.length > 0 ||
    matchedCircuits.length > 0 ||
    matchedRaces.length > 0 ||
    matchedDocs.length > 0 ||
    matchedTech.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl border border-[#2d3744] bg-[#111418] shadow-2xl font-mono text-xs">
        {/* Search Input Bar */}
        <div className="flex items-center px-3 py-3 border-b border-[#242c37] bg-[#0e1115]">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drivers (VER, 16), teams, circuits, regulations, documents..."
            className="flex-1 bg-transparent text-white text-xs placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-neutral-500 hover:text-white mr-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 bg-[#1f2631] text-[10px] text-neutral-400 border border-[#333d4d]">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {!q ? (
            <div className="p-4 text-center text-neutral-400 text-xs">
              Type to search drivers, teams, circuits, race weekends, technical reports, and FIA documents.
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-neutral-400 text-xs">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {/* Drivers */}
              {matchedDrivers.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-neutral-400" />
                    <span>DRIVERS</span>
                  </div>
                  {matchedDrivers.map(d => (
                    <div
                      key={d.id}
                      onClick={() => { onNavigate('drivers'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{d.fullName}</span>
                        <span className="text-neutral-400">({d.code} #{d.number})</span>
                      </div>
                      <span className="text-neutral-400">{d.teamName}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Teams */}
              {matchedTeams.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-neutral-400" />
                    <span>TEAMS</span>
                  </div>
                  {matchedTeams.map(t => (
                    <div
                      key={t.id}
                      onClick={() => { onNavigate('teams'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <span className="font-bold text-white">{t.name}</span>
                      <span className="text-neutral-400">{t.powerUnit}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Circuits */}
              {matchedCircuits.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    <span>CIRCUITS</span>
                  </div>
                  {matchedCircuits.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { onNavigate('circuits'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-neutral-400">{c.country} ({c.lengthKm} km)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Grand Prix Calendar */}
              {matchedRaces.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>GRAND PRIX SCHEDULE</span>
                  </div>
                  {matchedRaces.map(r => (
                    <div
                      key={r.id}
                      onClick={() => { onNavigate('weekend'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <span className="font-bold text-white">{r.officialName}</span>
                      <span className="text-neutral-400">Round {r.round} · {r.date}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* FIA Documents */}
              {matchedDocs.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-neutral-400" />
                    <span>FIA DOCUMENTS</span>
                  </div>
                  {matchedDocs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => { onNavigate('documents'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <span className="text-white truncate max-w-[360px]">{doc.title}</span>
                      <span className="text-neutral-400 shrink-0">Doc {doc.docNumber}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Technical */}
              {matchedTech.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-neutral-400" />
                    <span>TECHNICAL UPGRADES</span>
                  </div>
                  {matchedTech.map(tech => (
                    <div
                      key={tech.id}
                      onClick={() => { onNavigate('technical'); onClose(); }}
                      className="px-2.5 py-1.5 hover:bg-[#1a2029] cursor-pointer flex items-center justify-between text-neutral-200"
                    >
                      <span className="text-white truncate max-w-[360px]">{tech.team} — {tech.component}</span>
                      <span className="text-neutral-400 shrink-0">{tech.updateType}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 border-t border-[#242c37] bg-[#0d1014] text-[10px] text-neutral-400 flex items-center justify-between">
          <span>Formula 1 Pulse Query Engine</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
