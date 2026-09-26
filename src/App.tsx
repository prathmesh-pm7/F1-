import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { JolpicaProvider } from './providers/jolpicaProvider';
import { OpenF1Provider } from './providers/openF1Provider';
import { ReplayProvider } from './providers/replayProvider';
import { F1EnrichmentProvider } from './providers/f1EnrichmentProvider';
import { LiveTimingProvider } from './providers/liveTimingProvider';
import { getCurrentSeason, SUPPORTED_HISTORICAL_SEASONS } from './config/season';
import { LiveSessionSnapshot, LiveConnectionState, GrandPrix, DriverStanding, ConstructorStanding, Driver, Team, Circuit, DataProvenance, SessionDetail, SessionSchedule, NewsItem, TechnicalUpdate, FIADocument } from './types/f1';

const FAVORITE_TEAM_KEY = 'f1-pulse.favorite-team';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeason());
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(() => {
    try { return window.localStorage.getItem(FAVORITE_TEAM_KEY); } catch { return null; }
  });

  const jolpicaProvider = useMemo(() => new JolpicaProvider(), []);
  const openF1Provider = useMemo(() => new OpenF1Provider(), []);
  const enrichmentProvider = useMemo(() => new F1EnrichmentProvider(), []);
  const replayProviderRef = useRef<ReplayProvider | null>(null);
  const liveProviderRef = useRef<LiveTimingProvider | null>(null);
  if (!replayProviderRef.current) replayProviderRef.current = new ReplayProvider();
  if (!liveProviderRef.current) liveProviderRef.current = new LiveTimingProvider();
  const replayEngine = replayProviderRef.current;
  const liveEngine = liveProviderRef.current;

  const [isReplayMode, setIsReplayMode] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(() => replayEngine.getSnapshot());
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('REPLAY');
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const [schedule, setSchedule] = useState<GrandPrix[]>([]);
  const [scheduleProvenance, setScheduleProvenance] = useState<DataProvenance | undefined>();
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [standingsProvenance, setStandingsProvenance] = useState<DataProvenance | undefined>();
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [technicalUpdates, setTechnicalUpdates] = useState<TechnicalUpdate[]>([]);
  const [fiaDocuments, setFiaDocuments] = useState<FIADocument[]>([]);
  const [isLoadingSeason, setIsLoadingSeason] = useState(true);
  const [showTeamSetup, setShowTeamSetup] = useState(false);
  const [teamSetupDismissed, setTeamSetupDismissed] = useState(false);

  useEffect(() => {
    try {
      if (favoriteTeamId) window.localStorage.setItem(FAVORITE_TEAM_KEY, favoriteTeamId);
      else window.localStorage.removeItem(FAVORITE_TEAM_KEY);
    } catch { /* preference storage is optional */ }
  }, [favoriteTeamId]);

  useEffect(() => {
    let mounted = true;
    async function loadSeasonData() {
      setIsLoadingSeason(true);
      setScheduleError(null);
      setStandingsError(null);
      try {
        const [schedRes, dStandingsRes, cStandingsRes, circsRes, headshots, circuitMeta, fiaNews, technical] = await Promise.all([
          jolpicaProvider.getSchedule(selectedSeason),
          jolpicaProvider.getDriverStandings(selectedSeason),
          jolpicaProvider.getConstructorStandings(selectedSeason),
          jolpicaProvider.getCircuits(selectedSeason),
          openF1Provider.getSeasonDriverImages(selectedSeason).catch(() => ({})),
          openF1Provider.getSeasonCircuitMeta(selectedSeason).catch(() => ({})),
          enrichmentProvider.getFiaNews().catch(() => []),
          enrichmentProvider.getTechnicalUpdates().catch(() => [])
        ]);
        if (!mounted) return;
        setNews(fiaNews);
        setTechnicalUpdates(technical);

        if (schedRes.status === 'SUCCESS') { setSchedule(schedRes.data); setScheduleProvenance(schedRes.provenance); }
        else { setSchedule([]); setScheduleProvenance(schedRes.provenance); setScheduleError(schedRes.status === 'EMPTY' ? schedRes.message : schedRes.error); }

        if (dStandingsRes.status === 'SUCCESS') {
          setDriverStandings(dStandingsRes.data);
          setDrivers(dStandingsRes.data.map(s => ({ ...s.driver, headshotUrl: headshots[String(s.driver.number)] ?? headshots[s.driver.code], countryCode: s.driver.nationality })));
          
          setStandingsProvenance(dStandingsRes.provenance);
        } else {
          setDriverStandings([]); setDrivers([]); setStandingsProvenance(dStandingsRes.provenance);
          setStandingsError(dStandingsRes.status === 'EMPTY' ? dStandingsRes.message : dStandingsRes.error);
        }

        if (cStandingsRes.status === 'SUCCESS') {
          const driverCodesByTeam = new Map<string, string[]>();
          const driverData = dStandingsRes.status === 'SUCCESS' ? dStandingsRes.data : [];
          for (const standing of driverData) {
            const list = driverCodesByTeam.get(standing.driver.teamId) ?? [];
            list.push(standing.driver.code);
            driverCodesByTeam.set(standing.driver.teamId, list);
          }
          setConstructorStandings(cStandingsRes.data);
          setTeams(cStandingsRes.data.map(standing => ({
            ...standing.team,
            chassis: selectedSeason === 2026 ? ({mclaren:'MCL40',mercedes:'W17',red_bull:'RB22',ferrari:'SF-26',williams:'FW48',rb:'VCARB03',aston_martin:'AMR26',haas:'VF-26',audi:'R26',alpine:'A526',cadillac:'MAC-26'} as Record<string,string>)[standing.team.id] : undefined,
            drivers: driverCodesByTeam.get(standing.team.id) ?? []
          })));
        } else {
          setConstructorStandings([]);
          setTeams([]);
        }

        if (circsRes.status === 'SUCCESS') {
          setCircuits(circsRes.data.map(circuit => ({ ...circuit, ...(circuitMeta[circuit.country.toLowerCase()] ?? {}) })));
        } else setCircuits([]);
      } catch (error: unknown) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Unable to load season data.';
          setScheduleError(message);
          setStandingsError(message);
        }
      } finally {
        if (mounted) setIsLoadingSeason(false);
      }
    }
    void loadSeasonData();
    const refresh = window.setInterval(() => { void loadSeasonData(); }, 60_000);
    return () => { mounted = false; window.clearInterval(refresh); };
  }, [selectedSeason, jolpicaProvider, openF1Provider, enrichmentProvider]);

  useEffect(() => {
    let unsubSnapshot = () => {};
    let unsubState = () => {};
    if (isReplayMode) {
      unsubSnapshot = replayEngine.onSnapshot(setSnapshot);
      unsubState = replayEngine.onStateChange(setConnectionState);
      replayEngine.connect();
    } else {
      unsubSnapshot = liveEngine.onSnapshot(setSnapshot);
      unsubState = liveEngine.onStateChange(setConnectionState);
      liveEngine.connect();
    }
    return () => { unsubSnapshot(); unsubState(); };
  }, [isReplayMode, replayEngine, liveEngine]);

  const favoriteTeam = teams.find(team => team.id === favoriteTeamId) ?? null;
  useEffect(() => {
    if (!isLoadingSeason && teams.length > 0 && !favoriteTeam && !teamSetupDismissed) setShowTeamSetup(true);
  }, [isLoadingSeason, teams.length, favoriteTeam, teamSetupDismissed]);

  const rootStyle = {
    '--team-accent': favoriteTeam?.color ?? '#8b929b',
    '--team-accent-soft': favoriteTeam?.color ? `${favoriteTeam.color}20` : '#8b929b18',
    '--team-accent-strong': favoriteTeam?.color ?? '#8b929b'
  } as React.CSSProperties;

  const handleSwitchToReplay = () => {
    liveEngine.disconnect();
    replayEngine.pause();
    setIsReplayPlaying(false);
    setIsReplayMode(true);
    setSnapshot(replayEngine.getSnapshot());
    setConnectionState('REPLAY');
    replayEngine.connect();
  };

  const handleToggleProviderMode = () => {
    if (isReplayMode) {
      replayEngine.pause();
      setIsReplayPlaying(false);
      setIsReplayMode(false);
      liveEngine.connect();
    } else handleSwitchToReplay();
  };

  const loadSession = async (gp: GrandPrix, session: SessionSchedule): Promise<SessionDetail> => {
    try {
      // OpenF1 is the detailed session source for FP1/FP2/FP3, qualifying, sprint and race.
      return await openF1Provider.getSessionDetail(gp, session);
    } catch (openF1Error) {
      // Race/qualifying/sprint results have a free Jolpica fallback, so a finished race
      // still shows its winner/classification if OpenF1 is temporarily unavailable.
      if (session.type === 'RACE' || session.type === 'QUALIFYING' || session.type === 'SPRINT') {
        const fallback = await jolpicaProvider.getRaceWeekendData(gp.season, gp.round);
        if (fallback.status === 'SUCCESS') {
          return jolpicaProvider.toSessionDetail(fallback.data, session);
        }
      }
      throw openF1Error;
    }
  };

  return (
    <div style={rootStyle}>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        snapshot={snapshot}
        connectionState={connectionState}
        isReplayMode={isReplayMode}
        onToggleProviderMode={handleToggleProviderMode}
        searchData={{ drivers, teams, circuits, schedule, documents: fiaDocuments, technical: technicalUpdates }}
      >
        {activeTab === 'live' && (
          <LiveTimingWorkstation
            snapshot={snapshot}
            connectionState={connectionState}
            isReplayMode={isReplayMode}
            favoriteTeam={favoriteTeam}
            onPlayReplay={() => { replayEngine.play(); setIsReplayPlaying(true); }}
            onPauseReplay={() => { replayEngine.pause(); setIsReplayPlaying(false); }}
            onStepReplay={(delta) => replayEngine.stepLap(delta)}
            onSetReplaySpeed={(speed) => { replayEngine.setSpeed(speed); setReplaySpeed(speed); }}
            onJumpReplayLap={(lap) => replayEngine.jumpToLap(lap)}
            isReplayPlaying={isReplayPlaying}
            replaySpeed={replaySpeed}
            onConnectLive={() => liveEngine.connect()}
            onSwitchToReplay={handleSwitchToReplay}
          />
        )}
        {activeTab === 'weekend' && <WeekendHub schedule={schedule} drivers={drivers} teams={teams} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={scheduleProvenance} isLoading={isLoadingSeason} error={scheduleError} onLoadSession={loadSession} />}
        {activeTab === 'standings' && <StandingsWorkstation driverStandings={driverStandings} constructorStandings={constructorStandings} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={standingsProvenance} isLoading={isLoadingSeason} error={standingsError} />}
        {activeTab === 'drivers' && <DriversDirectory drivers={drivers} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={standingsProvenance} isLoading={isLoadingSeason} error={standingsError} />}
        {activeTab === 'teams' && (
          <TeamsDirectory
            teams={teams}
            drivers={drivers}
            selectedSeason={selectedSeason}
            onSelectSeason={setSelectedSeason}
            availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
            provenance={standingsProvenance}
            isLoading={isLoadingSeason}
            error={standingsError}
            favoriteTeamId={favoriteTeamId}
            onSelectFavorite={setFavoriteTeamId}
          />
        )}
        {activeTab === 'circuits' && <CircuitsDirectory circuits={circuits} selectedSeason={selectedSeason} onSelectSeason={setSelectedSeason} availableSeasons={SUPPORTED_HISTORICAL_SEASONS} provenance={scheduleProvenance} isLoading={isLoadingSeason} error={scheduleError} />}
        {activeTab === 'news' && <NewsBriefing news={news} />}
        {activeTab === 'technical' && <TechnicalUpdatesFeed updates={technicalUpdates} />}
        {activeTab === 'documents' && <FiaDocumentsViewer documents={fiaDocuments} />}
      </AppShell>
      {showTeamSetup && teams.length > 0 && (
        <div className="team-setup-overlay" role="dialog" aria-modal="true" aria-label="Choose your team">
          <div className="team-setup-panel">
            <div className="team-setup-kicker">PERSONAL WORKSPACE</div>
            <h1>Choose your team</h1>
            <p>Your team becomes the accent of the interface and its data gets priority throughout the app.</p>
            <div className="team-setup-grid">
              {teams.map(team => (
                <button key={team.id} type="button" className="team-setup-team" style={{'--setup-color': team.color} as React.CSSProperties}
                  onClick={() => { setFavoriteTeamId(team.id); setShowTeamSetup(false); setActiveTab('live'); }}>
                  <span className="team-setup-swatch" />
                  <span><strong>{team.name}</strong><small>{team.drivers?.join(' / ') || 'Drivers loading'}</small></span>
                  <b>P{team.position ?? '—'}</b>
                </button>
              ))}
            </div>
            <button type="button" className="team-setup-later" onClick={() => { setShowTeamSetup(false); setTeamSetupDismissed(true); }}>CHOOSE LATER</button>
          </div>
        </div>
      )}
    </div>
  );
}