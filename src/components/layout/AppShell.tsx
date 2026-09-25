import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { MobileNav } from './MobileNav';
import { WorkstationHeader } from './WorkstationHeader';
import { LiveSessionSnapshot, LiveConnectionState } from '../../types/f1';
import { GlobalCommandSearch } from '../search/GlobalCommandSearch';
import { X } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  isReplayMode: boolean;
  onToggleProviderMode: () => void;
  searchData: {
    drivers: any[];
    teams: any[];
    circuits: any[];
    schedule: any[];
    documents: any[];
    technical: any[];
  };
}

export const AppShell: React.FC<Props> = ({
  children,
  activeTab,
  onSelectTab,
  snapshot,
  connectionState,
  isReplayMode,
  onToggleProviderMode,
  searchData
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const handleMobileNavSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMobileMoreOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#0b0d10] text-[#e1e4ea]">
      {/* Persistent narrow desktop sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isLiveActive={connectionState === 'LIVE'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkstationHeader
          snapshot={snapshot}
          connectionState={connectionState}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleProviderMode={onToggleProviderMode}
          isReplayMode={isReplayMode}
        />

        <main className="flex-1 p-3 md:p-5 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={handleMobileNavSelect}
        onOpenMoreMenu={() => setIsMobileMoreOpen(true)}
        isLiveActive={connectionState === 'LIVE'}
      />

      {/* Mobile "More" Drawer Modal */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end md:hidden">
          <div className="bg-[#111418] border-t border-[#242c37] p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c222b] mb-3">
              <span className="font-bold text-white uppercase tracking-wider">ALL WORKSTATION SECTIONS</span>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'live', label: 'LIVE TIMING' },
                { id: 'weekend', label: 'RACE WEEKEND' },
                { id: 'standings', label: 'STANDINGS' },
                { id: 'drivers', label: 'DRIVERS' },
                { id: 'teams', label: 'TEAMS' },
                { id: 'circuits', label: 'CIRCUITS' },
                { id: 'news', label: 'NEWS BRIEFING' },
                { id: 'technical', label: 'TECHNICAL' },
                { id: 'documents', label: 'FIA DOCUMENTS' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMobileNavSelect(item.id as NavTab)}
                  className={`p-3 text-left border ${
                    activeTab === item.id
                      ? 'bg-[#1a2028] border-[#e10600] text-white font-bold'
                      : 'bg-[#14171d] border-[#222933] text-neutral-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Command Search Dialog */}
      <GlobalCommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onSelectTab}
        drivers={searchData.drivers}
        teams={searchData.teams}
        circuits={searchData.circuits}
        schedule={searchData.schedule}
        documents={searchData.documents}
        technical={searchData.technical}
      />
    </div>
  );
};
