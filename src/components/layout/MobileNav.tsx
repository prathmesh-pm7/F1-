import React from 'react';
import { NavTab } from './Sidebar';
import { Timer, CalendarDays, Trophy, Users, Menu } from 'lucide-react';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
  isLiveActive?: boolean;
}

export const MobileNav: React.FC<Props> = ({ activeTab, onSelectTab, onOpenMoreMenu, isLiveActive = false }) => {
  const items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'live', label: 'LIVE', icon: Timer },
    { id: 'weekend', label: 'WEEKEND', icon: CalendarDays },
    { id: 'standings', label: 'TABLE', icon: Trophy },
    { id: 'drivers', label: 'DRIVERS', icon: Users },
  ];

  return (
    <nav className="f1-mobile-nav md:hidden" aria-label="Mobile navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onSelectTab(id)} className={`f1-mobile-item ${activeTab === id ? 'is-active' : ''}`}>
          <span className="relative"><Icon className="w-4 h-4" />{id === 'live' && isLiveActive && <span className="f1-live-dot" />}</span>
          <span>{label}</span>
        </button>
      ))}
      <button type="button" onClick={onOpenMoreMenu} className="f1-mobile-item"><Menu className="w-4 h-4" /><span>MORE</span></button>
    </nav>
  );
};