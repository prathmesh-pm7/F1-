/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ReplayProvider } from './providers/replayProvider';
import { LiveTimingProvider } from './providers/liveTimingProvider';
import { MONZA_2024_RACE_RECORD } from './data/verifiedSessions';
import { VERIFIED_TECHNICAL_UPDATES } from './data/technicalUpdates';
import { VERIFIED_FIA_DOCUMENTS } from './data/fiaDocuments';
import { VERIFIED_NEWS } from './data/verifiedNews';

import {
  LiveSessionSnapshot,
  LiveConnectionState,
  GrandPrix,
  DriverStanding,
  ConstructorStanding,
  Driver,
  Team,
  Circuit
} from './types/f1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');

  // Providers
  const jolpicaProvider = useMemo(() => new JolpicaProvider(), []);
  const replayProviderRef = useRef<ReplayProvider | null>(null);
  const liveProviderRef = useRef<LiveTimingProvider | null>(null);

  if (!replayProviderRef.current) {
    replayProviderRef.current = new ReplayProvider();
  }
  if (!liveProviderRef.current) {
    liveProviderRef.current = new LiveTimingProvider();
  }

  const replayEngine = replayProviderRef.current;
  const liveEngine = liveProviderRef.current;

  // Mode: default to Replay mode (flagged clearly as REPLAY / FIXTURE DATA) so the user can immediately experience the live timing workstation
  const [isReplayMode, setIsReplayMode] = useState<boolean>(true);

  // Live session state
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(MONZA_2024_RACE_RECORD);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('REPLAY');
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  // F1 Season Data from Jolpica API
  const [schedule, setSchedule] = useState<GrandPrix[]>([]);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [isLoadingSeason, setIsLoadingSeason] = useState<boolean>(true);

  // Initialize season data
  useEffect(() => {
    let mounted = true;

    async function loadSeasonData() {
      try {
        setIsLoadingSeason(true);
        const [sched, dStandings, cStandings, circs] = await Promise.all([
          jolpicaProvider.getSchedule(2024),
          jolpicaProvider.getDriverStandings(2024),
          jolpicaProvider.getConstructorStandings(2024),
          jolpicaProvider.getCircuits()
        ]);

        if (mounted) {
          setSchedule(sched);
          setDriverStandings(dStandings);
          setConstructorStandings(cStandings);
          setDrivers(dStandings.map(s => s.driver));
          setTeams(cStandings.map(s => s.team));
          setCircuits(circs);
        }
      } catch (err) {
        console.error('Failed to load season data from Jolpica provider:', err);
      } finally {
        if (mounted) setIsLoadingSeason(false);
      }
    }

    loadSeasonData();

    return () => {
      mounted = false;
    };
  }, [jolpicaProvider]);

  // Hook up provider snapshots based on active mode
  useEffect(() => {
    let unsubSnapshot = () => {};
    let unsubState = () => {};

    if (isReplayMode) {
      unsubSnapshot = replayEngine.onSnapshot((newSnap) => {
        setSnapshot(newSnap);
      });
      unsubState = replayEngine.onStateChange((state) => {
        setConnectionState(state);
      });
      replayEngine.connect();
    } else {
      unsubState = liveEngine.onStateChange((state) => {
        setConnectionState(state);
      });
      unsubSnapshot = liveEngine.onSnapshot((newSnap) => {
        setSnapshot(newSnap);
      });
      // Try connecting to live SignalR endpoint
      liveEngine.connect();
    }

    return () => {
      unsubSnapshot();
      unsubState();
    };
  }, [isReplayMode, replayEngine, liveEngine]);

  // Replay handlers
  const handlePlayReplay = () => {
    replayEngine.play();
    setIsReplayPlaying(true);
  };

  const handlePauseReplay = () => {
    replayEngine.pause();
    setIsReplayPlaying(false);
  };

  const handleStepReplay = (delta: number) => {
    replayEngine.stepLap(delta);
  };

  const handleSetReplaySpeed = (speed: number) => {
    replayEngine.setSpeed(speed);
    setReplaySpeed(speed);
  };

  const handleJumpReplayLap = (lap: number) => {
    replayEngine.jumpToLap(lap);
  };

  const handleToggleProviderMode = () => {
    if (isReplayMode) {
      replayEngine.pause();
      setIsReplayPlaying(false);
      setIsReplayMode(false);
      liveEngine.connect();
    } else {
      setIsReplayMode(true);
      replayEngine.connect();
    }
  };

  const handleConnectLive = () => {
    liveEngine.connect();
  };

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      snapshot={snapshot}
      connectionState={connectionState}
      isReplayMode={isReplayMode}
      onToggleProviderMode={handleToggleProviderMode}
      searchData={{
        drivers,
        teams,
        circuits,
        schedule,
        documents: VERIFIED_FIA_DOCUMENTS,
        technical: VERIFIED_TECHNICAL_UPDATES
      }}
    >
      {activeTab === 'live' && (
        <LiveTimingWorkstation
          snapshot={snapshot}
          connectionState={connectionState}
          isReplayMode={isReplayMode}
          onPlayReplay={handlePlayReplay}
          onPauseReplay={handlePauseReplay}
          onStepReplay={handleStepReplay}
          onSetReplaySpeed={handleSetReplaySpeed}
          onJumpReplayLap={handleJumpReplayLap}
          isReplayPlaying={isReplayPlaying}
          replaySpeed={replaySpeed}
          onConnectLive={handleConnectLive}
        />
      )}

      {activeTab === 'weekend' && (
        <WeekendHub schedule={schedule} />
      )}

      {activeTab === 'standings' && (
        <StandingsWorkstation
          driverStandings={driverStandings}
          constructorStandings={constructorStandings}
        />
      )}

      {activeTab === 'drivers' && (
        <DriversDirectory drivers={drivers} />
      )}

      {activeTab === 'teams' && (
        <TeamsDirectory teams={teams} />
      )}

      {activeTab === 'circuits' && (
        <CircuitsDirectory circuits={circuits} />
      )}

      {activeTab === 'news' && (
        <NewsBriefing news={VERIFIED_NEWS} />
      )}

      {activeTab === 'technical' && (
        <TechnicalUpdatesFeed updates={VERIFIED_TECHNICAL_UPDATES} />
      )}

      {activeTab === 'documents' && (
        <FiaDocumentsViewer documents={VERIFIED_FIA_DOCUMENTS} />
      )}
    </AppShell>
  );
}
