import React from 'react';
import { NavTab } from './Sidebar';
import { Timer, Calendar, Trophy, Users, FileText, Menu } from 'lucide-react';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
  isLiveActive?: boolean;
}

export const MobileNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenMoreMenu,
  isLiveActive = false
}) => {
  const primaryTabs: Array<{ id: NavTab; label: string; icon: React.FC<any>; badge?: boolean }> = [
    { id: 'live', label: 'LIVE', icon: Timer, badge: isLiveActive },
    { id: 'weekend', label: 'WEEKEND', icon: Calendar },
    { id: 'standings', label: 'STANDINGS', icon: Trophy },
    { id: 'drivers', label: 'DRIVERS', icon: Users },
    { id: 'documents', label: 'DOCS', icon: FileText }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1014] border-t border-[#242c37] flex items-center justify-around h-14 px-1 safe-bottom">
      {primaryTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center h-full min-w-0 py-1 transition-colors relative ${
              isActive
                ? 'text-[#e10600] font-bold border-t-2 border-[#e10600]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4 mb-0.5" />
              {tab.badge && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#e10600] animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-mono tracking-tight uppercase truncate">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* More Drawer button */}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        className="flex-1 flex flex-col items-center justify-center h-full min-w-0 py-1 text-neutral-400 hover:text-neutral-200"
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] font-mono tracking-tight uppercase truncate">
          MORE
        </span>
      </button>
    </nav>
  );
};
