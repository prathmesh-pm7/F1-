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

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeason());
  const season = useSeasonData(selectedSeason);
  const live = useLiveSession(season.activeLiveSession);
  const favorite = useFavoriteTeam(season.teams);
  const favoriteColor = favorite.favoriteTeam?.color ?? '#e10600';
  const rootStyle = { '--team-accent': favoriteColor, '--team-accent-soft': 'color-mix(in srgb, ' + favoriteColor + ' 16%, transparent)', '--team-accent-strong': favoriteColor, '--f1-red': favoriteColor, '--f1-red-bright': 'color-mix(in srgb, ' + favoriteColor + ' 72%, white)', '--f1-red-soft': 'color-mix(in srgb, ' + favoriteColor + ' 16%, transparent)' } as React.CSSProperties;
  return <div style={rootStyle}>
    <AppShell activeTab={activeTab} onSelectTab={setActiveTab} snapshot={live.snapshot} connectionState={live.connectionState} isReplayMode={live.isReplayMode} onToggleProviderMode={live.toggleProviderMode} searchData={{ drivers: season.drivers, teams: season.teams, circuits: season.circuits, schedule: season.schedule, documents: season.fiaDocuments, technical: season.technicalUpdates }}>
      {activeTab === 'live' && <LiveTimingWorkstation snapshot={live.snapshot} connectionState={live.connectionState} isReplayMode={live.isReplayMode} favoriteTeam={favorite.favoriteTeam} onPlayReplay={() => { live.replayEngine.play(); live.setIsReplayPlaying(true); }} onPauseReplay={() => { live.replayEngine.pause(); live.setIsReplayPlaying(false); }} onStepReplay={delta => live.replayEngine.stepLap(delta)} onSetReplaySpeed={speed => { live.replayEngine.setSpeed(speed); live.setReplaySpeed(speed); }} onJumpReplayLap={lap => live.replayEngine.jumpToLap(lap)} isReplayPlaying={live.isReplayPlaying} replaySpeed={live.replaySpeed} onConnectLive={() => live.liveEngine.connect()} sessionContext={season.activeLiveSession ? { sessionName: season.activeLiveSession.session.name, circuitName: season.activeLiveSession.gp.circuit.name } : null} onSwitchToReplay={live.switchToReplay} />}
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
