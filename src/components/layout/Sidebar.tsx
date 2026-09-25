import React from 'react';
import { Timer, CalendarDays, Trophy, Users, Shield, MapPin, Newspaper, Wrench, FileText, Search } from 'lucide-react';

export type NavTab =
  | 'live' | 'weekend' | 'standings' | 'drivers' | 'teams'
  | 'circuits' | 'news' | 'technical' | 'documents';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isLiveActive?: boolean;
}

const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'live', label: 'LIVE', icon: Timer },
  { id: 'weekend', label: 'WEEKEND', icon: CalendarDays },
  { id: 'standings', label: 'STANDINGS', icon: Trophy },
  { id: 'drivers', label: 'DRIVERS', icon: Users },
  { id: 'teams', label: 'TEAMS', icon: Shield },
  { id: 'circuits', label: 'CIRCUITS', icon: MapPin },
  { id: 'news', label: 'NEWS', icon: Newspaper },
  { id: 'technical', label: 'TECHNICAL', icon: Wrench },
  { id: 'documents', label: 'FIA DOCS', icon: FileText },
];

export const Sidebar: React.FC<Props> = ({ activeTab, onSelectTab, isLiveActive = false }) => (
  <aside className="f1-sidebar hidden md:flex">
    <div className="f1-brand">
      <span className="f1-brand-mark" aria-hidden="true" />
      <div>
        <div className="f1-brand-name">F1 PULSE</div>
        <div className="f1-brand-sub">RACE CONTROL / DATA</div>
      </div>
    </div>

    <nav className="f1-nav" aria-label="Primary navigation">
      <div className="f1-nav-label">WORKSPACE</div>
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectTab(id)}
            className={`f1-nav-item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="f1-nav-icon" />
            <span>{label}</span>
            {id === 'live' && isLiveActive && <span className="f1-live-dot" aria-label="Live data connected" />}
          </button>
        );
      })}
    </nav>

    <div className="f1-sidebar-foot">
      <div><span>DATA</span><strong>JOLPICA / FIA</strong></div>
      <div><span>LIVE</span><strong>{isLiveActive ? 'CONNECTED' : 'WAITING'}</strong></div>
      <div className="f1-tagline">EVERY LAP. EVERY GAP. EVERY UPDATE.</div>
    </div>
  </aside>
);