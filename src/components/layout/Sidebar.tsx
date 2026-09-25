import React from 'react';
import {
  Timer,
  Calendar,
  Trophy,
  Users,
  Shield,
  MapPin,
  Newspaper,
  Wrench,
  FileText
} from 'lucide-react';

export type NavTab =
  | 'live'
  | 'weekend'
  | 'standings'
  | 'drivers'
  | 'teams'
  | 'circuits'
  | 'news'
  | 'technical'
  | 'documents';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isLiveActive?: boolean;
}

export const Sidebar: React.FC<Props> = ({ activeTab, onSelectTab, isLiveActive = false }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.FC<any>; badge?: string }> = [
    { id: 'live', label: 'LIVE TIMING', icon: Timer, badge: isLiveActive ? 'LIVE' : undefined },
    { id: 'weekend', label: 'RACE WEEKEND', icon: Calendar },
    { id: 'standings', label: 'STANDINGS', icon: Trophy },
    { id: 'drivers', label: 'DRIVERS', icon: Users },
    { id: 'teams', label: 'TEAMS', icon: Shield },
    { id: 'circuits', label: 'CIRCUITS', icon: MapPin },
    { id: 'news', label: 'NEWS BRIEFING', icon: Newspaper },
    { id: 'technical', label: 'TECHNICAL', icon: Wrench },
    { id: 'documents', label: 'FIA DOCUMENTS', icon: FileText }
  ];

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 hidden md:flex flex-col bg-[#0b0d10] border-r border-[#242c37] z-40 select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-[#242c37] bg-[#0d1014]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-[#e10600]"></div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-black tracking-tight text-white">F1 PULSE</span>
              <span className="text-[9px] font-mono px-1 py-0.2 bg-[#222933] text-neutral-400 border border-[#333d4d]">v2.4</span>
            </div>
            <p className="text-[9px] font-mono text-neutral-400 tracking-wider uppercase -mt-0.5">
              RACE TIMING SYSTEM
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">
          Workstation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-mono tracking-wider transition-colors text-left relative ${
                isActive
                  ? 'bg-[#161a20] text-white font-semibold border-l-2 border-[#e10600]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#12151a]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#e10600]' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="px-1 py-0.2 text-[9px] font-bold bg-[#e10600] text-white tracking-widest animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#242c37] bg-[#0d1014] text-[10px] font-mono text-neutral-400 space-y-1">
        <div className="flex justify-between">
          <span>DATA PROVENANCE</span>
          <span className="text-neutral-300 font-medium">JOLPICA / FIA</span>
        </div>
        <div className="flex justify-between">
          <span>SIGNALR PROTOCOL</span>
          <span className="text-neutral-300">CORE v1</span>
        </div>
        <div className="pt-1 text-[9px] text-neutral-400 border-t border-[#1c222b]">
          Every lap. Every gap. Every update.
        </div>
      </div>
    </aside>
  );
};
