import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { NavTab } from './components/layout/Sidebar';
import { LiveTimingWorkstation } from './components/timing/LiveTimingWorkstation';
import { WeekendHub } from './components/weekend/WeekendHub';
import { StandingsWorkstation } from './components/standings/StandingsWorkstation';
import { DriversDirectory } from './components/drivers/DriversDirectory';
import { TeamsDirectory } from './components/teams/TeamsDirectory';
import { CircuitsDirectory } from './components/circuits/CircuitsDirectory';
import { NewsBriefing } from './components/news/NewsBriefing';
import { TechnicalUpdatesFeed } from './components/technical/TechnicalUpdatesFeed';
import { FiaDocumentsViewer } from './components/documents/FiaDocumentsViewer';
import { getCurrentSeason, SUPPORTED_HISTORICAL_SEASONS } from './config/season';
import { useSeasonData } from './hooks/useSeasonData';
import { useLiveSession } from './hooks/useLiveSession';
import { useFavoriteTeam } from './hooks/useFavoriteTeam';
import { Team } from './types/f1';


const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
};
const luminance = (hex: string) => {
  const rgb = hexToRgb(hex); if (!rgb) return 0;
  const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};
const contrast = (foreground: string, background: string) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const blendWithWhite = (hex: string, amount: number) => {
  const rgb = hexToRgb(hex); if (!rgb) return '#ffffff';
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return '#' + [mix(rgb.r), mix(rgb.g), mix(rgb.b)].map(v => v.toString(16).padStart(2, '0')).join('');
};
const getReadableAccent = (hex: string) => {
  const background = '#0b0d10';
  if (contrast(hex, background) >= 4.5) return hex;
  for (let step = 1; step <= 20; step += 1) {
    const lifted = blendWithWhite(hex, step / 20);
    if (contrast(lifted, background) >= 4.5) return lifted;
  }
  return '#ffffff';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeason());
  const season = useSeasonData(selectedSeason);
  const live = useLiveSession(season.activeLiveSession);
  const favorite = useFavoriteTeam(season.teams);
  const favoriteColor = favorite.favoriteTeam?.color ?? '#e10600';
  const readableAccent = getReadableAccent(favoriteColor);
  const rootStyle = {
    '--team-accent': favoriteColor,
    '--team-accent-readable': readableAccent,
    '--team-accent-border': '#2d3748',
    '--team-accent-soft': 'rgba(255, 255, 255, 0.04)',
    '--team-accent-strong': favoriteColor,
    '--f1-red': '#e10600',
    '--f1-red-bright': '#e10600',
    '--f1-red-soft': 'rgba(225, 6, 0, 0.08)'
  } as React.CSSProperties;
  return <div style={rootStyle}>
    <AppShell activeTab={activeTab} onSelectTab={setActiveTab} snapshot={live.snapshot} connectionState={live.connectionState} isReplayMode={live.isReplayMode} onToggleProviderMode={live.toggleProviderMode} searchData={{ drivers: season.drivers, teams: season.teams, circuits: season.circuits, schedule: season.schedule, documents: season.fiaDocuments, technical: season.technicalUpdates }}>
      {activeTab === 'live' && <LiveTimingWorkstation snapshot={live.snapshot} connectionState={live.connectionState} isReplayMode={live.isReplayMode} favoriteTeam={favorite.favoriteTeam} driverStandings={season.driverStandings} getCompletedLaps={live.getCompletedLaps} onPlayReplay={() => { live.replayEngine.play(); live.setIsReplayPlaying(true); }} onPauseReplay={() => { live.replayEngine.pause(); live.setIsReplayPlaying(false); }} onStepReplay={delta => live.replayEngine.stepLap(delta)} onSetReplaySpeed={speed => { live.replayEngine.setSpeed(speed); live.setReplaySpeed(speed); }} onJumpReplayLap={lap => live.replayEngine.jumpToLap(lap)} isReplayPlaying={live.isReplayPlaying} replaySpeed={live.replaySpeed} onConnectLive={() => live.liveEngine.connect()} onSwitchToReplay={live.switchToReplay} />}
      {activeTab === 'weekend' && <WeekendHub schedule={season.schedule} drivers={season.drivers} teams={season.teams} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={season.scheduleProvenance} isLoading={season.isLoadingSeason} error={season.scheduleError} onLoadSession={season.loadSession} onReplayRace={live.handleReplayRace} />}
      {activeTab === 'standings' && <StandingsWorkstation driverStandings={season.driverStandings} constructorStandings={season.constructorStandings} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={season.standingsProvenance} isLoading={season.isLoadingSeason} error={season.standingsError} />}
      {activeTab === 'drivers' && <DriversDirectory drivers={season.drivers} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={season.standingsProvenance} isLoading={season.isLoadingSeason} error={season.standingsError} />}
      {activeTab === 'teams' && <TeamsDirectory teams={season.teams} drivers={season.drivers} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={season.standingsProvenance} isLoading={season.isLoadingSeason} error={season.standingsError} favoriteTeamId={favorite.favoriteTeamId} onSelectFavorite={favorite.setFavoriteTeamId} />}
      {activeTab === 'circuits' && <CircuitsDirectory circuits={season.circuits} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={season.scheduleProvenance} isLoading={season.isLoadingSeason} error={season.scheduleError} />}
      {activeTab === 'news' && <NewsBriefing news={season.news} />}{activeTab === 'technical' && <TechnicalUpdatesFeed updates={season.technicalUpdates} />}{activeTab === 'documents' && <FiaDocumentsViewer documents={season.fiaDocuments} />}
    </AppShell>
    {favorite.showTeamSetup && season.teams.length > 0 && <div className="team-setup-overlay" role="dialog" aria-modal="true" aria-label="Choose your team"><div className="team-setup-panel"><div className="team-setup-kicker">PERSONAL WORKSPACE</div><h1>Choose your team</h1><p>Your team becomes the accent of the interface and its data gets priority throughout the app.</p><div className="team-setup-grid">{season.teams.map((team: Team) => <button key={team.id} type="button" className="team-setup-team" style={{ '--setup-color': team.color } as React.CSSProperties} onClick={() => { favorite.setFavoriteTeamId(team.id); favorite.setShowTeamSetup(false); setActiveTab('live'); }}><span className="team-setup-swatch" /><span><strong>{team.name}</strong><small>{team.drivers?.join(' / ') || 'Drivers loading'}</small></span><b>P{team.position ?? '—'}</b></button>)}</div><button type="button" className="team-setup-later" onClick={() => { favorite.setShowTeamSetup(false); favorite.setTeamSetupDismissed(true); }}>CHOOSE LATER</button></div></div>}
  </div>;
}
