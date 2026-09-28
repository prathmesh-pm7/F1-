import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Users, Shield, MapPin, Calendar, FileText, Wrench } from 'lucide-react';
import { Driver, Team, Circuit, GrandPrix, FIADocument, TechnicalUpdate } from '../../types/f1';
import { NavTab } from '../layout/Sidebar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onNavigate: (tab: NavTab) => void;
  drivers: Driver[];
  teams: Team[];
  circuits: Circuit[];
  schedule: GrandPrix[];
  documents: FIADocument[];
  technical: TechnicalUpdate[];
}

type SearchItem = { id: string; label: string; meta: string; tab: NavTab; section: string };

export const GlobalCommandSearch: React.FC<Props> = ({ isOpen, onClose, onToggle, onNavigate, drivers, teams, circuits, schedule, documents, technical }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const items = useMemo<SearchItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return [
      ...drivers.filter(d => d.fullName.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || String(d.number) === q).slice(0, 3).map(d => ({ id: `driver-${d.id}`, label: d.fullName, meta: `${d.code} #${d.number} · ${d.teamName}`, tab: 'drivers' as NavTab, section: 'DRIVERS' })),
      ...teams.filter(t => t.name.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q)).slice(0, 2).map(t => ({ id: `team-${t.id}`, label: t.name, meta: t.powerUnit, tab: 'teams' as NavTab, section: 'TEAMS' })),
      ...circuits.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 2).map(c => ({ id: `circuit-${c.id}`, label: c.name, meta: c.country, tab: 'circuits' as NavTab, section: 'CIRCUITS' })),
      ...schedule.filter(r => r.name.toLowerCase().includes(q) || r.country.toLowerCase().includes(q)).slice(0, 2).map(r => ({ id: `race-${r.id}`, label: r.officialName, meta: `Round ${r.round} · ${r.date}`, tab: 'weekend' as NavTab, section: 'GRAND PRIX SCHEDULE' })),
      ...documents.filter(d => d.title.toLowerCase().includes(q) || String(d.docNumber) === q).slice(0, 2).map(d => ({ id: `doc-${d.id}`, label: d.title, meta: `Doc ${d.docNumber}`, tab: 'documents' as NavTab, section: 'FIA DOCUMENTS' })),
      ...technical.filter(t => t.team.toLowerCase().includes(q) || t.component.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)).slice(0, 2).map(t => ({ id: `technical-${t.id}`, label: `${t.team} — ${t.component}`, meta: t.updateType, tab: 'technical' as NavTab, section: 'TECHNICAL UPGRADES' }))
    ];
  }, [query, drivers, teams, circuits, schedule, documents, technical]);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setActiveIndex(0); return; }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onToggle();
        return;
      }
      if (!isOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); if (items.length) setActiveIndex(index => (index + 1) % items.length); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); if (items.length) setActiveIndex(index => (index - 1 + items.length) % items.length); return; }
      if (event.key === 'Enter' && items[activeIndex]) { event.preventDefault(); onNavigate(items[activeIndex].tab); onClose(); return; }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isOpen, items, onClose, onNavigate, onToggle]);

  if (!isOpen) return null;
  const grouped = items.reduce<Record<string, SearchItem[]>>((groups, item) => { (groups[item.section] ??= []).push(item); return groups; }, {});
  let resultIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xs" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="w-full max-w-xl border border-[#2d3744] bg-[#111418] shadow-2xl font-mono text-xs" role="dialog" aria-modal="true" aria-label="Global search">
        <div className="flex items-center px-3 py-3 border-b border-[#242c37] bg-[#0e1115]">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" aria-hidden="true" />
          <input ref={inputRef} type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search drivers, teams, circuits, weekends, technical reports, FIA documents..." aria-label="Search F1 Pulse" aria-activedescendant={items[activeIndex] ? `search-result-${items[activeIndex].id}` : undefined} className="flex-1 bg-transparent text-white text-xs placeholder-neutral-500 focus:outline-none" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-neutral-500 hover:text-white mr-2"><X className="w-3.5 h-3.5" /></button>}
          <kbd className="px-1.5 py-0.5 bg-[#1f2631] text-[10px] text-neutral-400 border border-[#333d4d]">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2 space-y-3" role="listbox" aria-label="Search results">
          {!query.trim() ? <div className="p-4 text-center text-neutral-400 text-xs">Type to search drivers, teams, circuits, race weekends, technical reports, and FIA documents.</div> : !items.length ? <div className="p-4 text-center text-neutral-400 text-xs">No matching records found for &quot;{query}&quot;.</div> : Object.entries(grouped).map(([section, sectionItems]) => (
            <div key={section}>
              <div className="px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                {section === 'DRIVERS' && <Users className="w-3 h-3" aria-hidden="true" />}
                {section === 'TEAMS' && <Shield className="w-3 h-3" aria-hidden="true" />}
                {section === 'CIRCUITS' && <MapPin className="w-3 h-3" aria-hidden="true" />}
                {section === 'GRAND PRIX SCHEDULE' && <Calendar className="w-3 h-3" aria-hidden="true" />}
                {section === 'FIA DOCUMENTS' && <FileText className="w-3 h-3" aria-hidden="true" />}
                {section === 'TECHNICAL UPGRADES' && <Wrench className="w-3 h-3" aria-hidden="true" />}
                <span>{section}</span>
              </div>
              {sectionItems.map(item => {
                const index = ++resultIndex;
                const selected = index === activeIndex;
                return <button key={item.id} id={`search-result-${item.id}`} type="button" role="option" aria-selected={selected} onClick={() => { onNavigate(item.tab); onClose(); }} className={`w-full px-2.5 py-2 text-left flex items-center justify-between gap-4 text-neutral-200 ${selected ? 'bg-[#1a2029]' : 'hover:bg-[#171c23]'}`}>
                  <span className="min-w-0 truncate"><strong className="text-white">{item.label}</strong></span>
                  <span className="text-neutral-400 shrink-0">{item.meta}</span>
                </button>;
              })}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[#242c37] bg-[#0d1014] text-[10px] text-neutral-400 flex items-center justify-between">
          <span>F1 Pulse Query Engine</span><span>↑↓ navigate · Enter open · Esc close</span>
        </div>
      </div>
    </div>
  );
};
