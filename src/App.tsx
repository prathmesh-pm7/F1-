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
import { VERIFIED_TECHNICAL_UPDATES } from './data/technicalUpdates';
import { VERIFIED_FIA_DOCUMENTS } from './data/fiaDocuments';
import { VERIFIED_NEWS } from './data/verifiedNews';
import { getCurrentSeason, SUPPORTED_HISTORICAL_SEASONS } from './config/season';

import {
  LiveSessionSnapshot,
  LiveConnectionState,
  GrandPrix,
  DriverStanding,
  ConstructorStanding,
  Driver,
  Team,
  Circuit,
  DataProvenance
} from './types/f1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');

  // Active Season State - initialized dynamically rather than hardcoding 2024
  const [selectedSeason, setSelectedSeason] = useState<number>(getCurrentSeason());

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

  // Mode: default to Replay mode (flagged clearly as REPLAY / FIXTURE DATA) so the user can immediately experience the timing workstation
  const [isReplayMode, setIsReplayMode] = useState<boolean>(true);

  // Live session state
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(() => {
    // Initial snapshot from replay engine
    return replayEngine.getSnapshot();
  });

  const [connectionState, setConnectionState] = useState<LiveConnectionState>('REPLAY');
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  // F1 Season Data from Jolpica API
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

  const [isLoadingSeason, setIsLoadingSeason] = useState<boolean>(true);

  // Load season data whenever selectedSeason changes
  useEffect(() => {
    let mounted = true;

    async function loadSeasonData() {
      try {
        setIsLoadingSeason(true);
        setScheduleError(null);
        setStandingsError(null);

        const [schedRes, dStandingsRes, cStandingsRes, circsRes] = await Promise.all([
          jolpicaProvider.getSchedule(selectedSeason),
          jolpicaProvider.getDriverStandings(selectedSeason),
          jolpicaProvider.getConstructorStandings(selectedSeason),
          jolpicaProvider.getCircuits(selectedSeason)
        ]);

        if (!mounted) return;

        // Schedule
        if (schedRes.status === 'SUCCESS') {
          setSchedule(schedRes.data);
          setScheduleProvenance(schedRes.provenance);
        } else if (schedRes.status === 'EMPTY') {
          setSchedule([]);
          setScheduleProvenance(schedRes.provenance);
          setScheduleError(schedRes.message);
        } else {
          setSchedule([]);
          setScheduleProvenance(schedRes.provenance);
          setScheduleError(schedRes.error);
        }

        // Driver Standings
        if (dStandingsRes.status === 'SUCCESS') {
          setDriverStandings(dStandingsRes.data);
          setDrivers(dStandingsRes.data.map(s => s.driver));
          setStandingsProvenance(dStandingsRes.provenance);
        } else if (dStandingsRes.status === 'EMPTY') {
          setDriverStandings([]);
          setDrivers([]);
          setStandingsProvenance(dStandingsRes.provenance);
          setStandingsError(dStandingsRes.message);
        } else {
          setDriverStandings([]);
          setDrivers([]);
          setStandingsProvenance(dStandingsRes.provenance);
          setStandingsError(dStandingsRes.error);
        }

        // Constructor Standings
        if (cStandingsRes.status === 'SUCCESS') {
          setConstructorStandings(cStandingsRes.data);
          setTeams(cStandingsRes.data.map(s => s.team));
        } else {
          setConstructorStandings([]);
          setTeams([]);
        }

        // Circuits
        if (circsRes.status === 'SUCCESS') {
          setCircuits(circsRes.data);
        } else {
          setCircuits([]);
        }
      } catch (err: any) {
        console.error('Failed to load season data:', err);
      } finally {
        if (mounted) setIsLoadingSeason(false);
      }
    }

    loadSeasonData();

    return () => {
      mounted = false;
    };
  }, [selectedSeason, jolpicaProvider]);

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
      liveEngine.disconnect();
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
        <WeekendHub
          schedule={schedule}
          selectedSeason={selectedSeason}
          onSelectSeason={setSelectedSeason}
          availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
          provenance={scheduleProvenance}
          isLoading={isLoadingSeason}
          error={scheduleError}
        />
      )}

      {activeTab === 'standings' && (
        <StandingsWorkstation
          driverStandings={driverStandings}
          constructorStandings={constructorStandings}
          selectedSeason={selectedSeason}
          onSelectSeason={setSelectedSeason}
          availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
          provenance={standingsProvenance}
          isLoading={isLoadingSeason}
          error={standingsError}
        />
      )}

      {activeTab === 'drivers' && (
        <DriversDirectory
          drivers={drivers}
          selectedSeason={selectedSeason}
          onSelectSeason={setSelectedSeason}
          availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
          provenance={standingsProvenance}
          isLoading={isLoadingSeason}
          error={standingsError}
        />
      )}

      {activeTab === 'teams' && (
        <TeamsDirectory
          teams={teams}
          selectedSeason={selectedSeason}
          onSelectSeason={setSelectedSeason}
          availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
          provenance={standingsProvenance}
          isLoading={isLoadingSeason}
          error={standingsError}
        />
      )}

      {activeTab === 'circuits' && (
        <CircuitsDirectory
          circuits={circuits}
          selectedSeason={selectedSeason}
          onSelectSeason={setSelectedSeason}
          availableSeasons={SUPPORTED_HISTORICAL_SEASONS}
          provenance={scheduleProvenance}
          isLoading={isLoadingSeason}
          error={scheduleError}
        />
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
