import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { MobileNav } from './MobileNav';
import { WorkstationHeader } from './WorkstationHeader';
import { LiveSessionSnapshot, LiveConnectionState, Driver, Team, Circuit, GrandPrix, FIADocument, TechnicalUpdate } from '../../types/f1';
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
    drivers: Driver[];
    teams: Team[];
    circuits: Circuit[];
    schedule: GrandPrix[];
    documents: FIADocument[];
    technical: TechnicalUpdate[];
  };
}

export const AppShell: React.FC<Props> = (props) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className="f1-app">
      <Sidebar activeTab={props.activeTab} onSelectTab={props.onSelectTab} isLiveActive={props.connectionState === 'LIVE'} />

      <div className="f1-main">
        <WorkstationHeader
          snapshot={props.snapshot}
          connectionState={props.connectionState}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleProviderMode={props.onToggleProviderMode}
          isReplayMode={props.isReplayMode}
        />
        <main className="f1-content">{props.children}</main>
      </div>

      <MobileNav
        activeTab={props.activeTab}
        onSelectTab={(tab) => { props.onSelectTab(tab); setIsMoreOpen(false); }}
        onOpenMoreMenu={() => setIsMoreOpen(true)}
        isLiveActive={props.connectionState === 'LIVE'}
      />

      {isMoreOpen && (
        <div className="f1-mobile-sheet md:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <div className="f1-sheet-panel">
            <div className="f1-sheet-head">
              <span>ALL SECTIONS</span>
              <button type="button" onClick={() => setIsMoreOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="f1-sheet-grid">
              {([
                ['live', 'LIVE'], ['weekend', 'WEEKEND'], ['standings', 'STANDINGS'],
                ['drivers', 'DRIVERS'], ['teams', 'TEAMS'], ['circuits', 'CIRCUITS'],
                ['news', 'NEWS'], ['technical', 'TECHNICAL'], ['documents', 'FIA DOCS']
              ] as Array<[NavTab, string]>).map(([id, label]) => (
                <button key={id} type="button" className={`f1-sheet-item ${props.activeTab === id ? 'is-active' : ''}`} onClick={() => { props.onSelectTab(id); setIsMoreOpen(false); }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <GlobalCommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={props.onSelectTab}
        drivers={props.searchData.drivers}
        teams={props.searchData.teams}
        circuits={props.searchData.circuits}
        schedule={props.searchData.schedule}
        documents={props.searchData.documents}
        technical={props.searchData.technical}
      />
    </div>
  );
};