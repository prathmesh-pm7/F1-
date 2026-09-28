import React, { useEffect, useState } from 'react';
import { LiveSessionSnapshot, TimingEntry, LiveConnectionState, Team, DriverStanding, LapTelemetry } from '../../types/f1';
import { FlagStatusBanner } from '../race-control/FlagStatusBanner';
import { TimingTable } from './TimingTable';
import { DriverTelemetryDrawer } from './DriverTelemetryDrawer';
import { MiniGapTracker } from './MiniGapTracker';
import { ReplayController } from './ReplayController';
import { RaceControlFeed } from '../race-control/RaceControlFeed';
import { PerformanceInsights } from './PerformanceInsights';
import { RefreshCw } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot; connectionState: LiveConnectionState; isReplayMode: boolean; favoriteTeam: Team | null;
  driverStandings?: DriverStanding[];
  getCompletedLaps?: (upToLap?: number) => LapTelemetry[];
  onPlayReplay: () => void; onPauseReplay: () => void; onStepReplay: (delta: number) => void; onSetReplaySpeed: (speed: number) => void; onJumpReplayLap: (lap: number) => void;
  isReplayPlaying: boolean; replaySpeed: number; onConnectLive: () => void; onSwitchToReplay: () => void;
}

export const LiveTimingWorkstation: React.FC<Props> = ({ snapshot, connectionState, isReplayMode, favoriteTeam, driverStandings = [], getCompletedLaps, onPlayReplay, onPauseReplay, onStepReplay, onSetReplaySpeed, onJumpReplayLap, isReplayPlaying, replaySpeed, onConnectLive, onSwitchToReplay }) => {
  const [selectedDriver, setSelectedDriver] = useState<TimingEntry | null>(snapshot.entries[0] || null);
  const favoriteEntries = favoriteTeam ? snapshot.entries.filter(entry => entry.teamName === favoriteTeam.name || entry.teamName === favoriteTeam.fullName) : [];

  useEffect(() => {
    setSelectedDriver(current => current ? snapshot.entries.find(entry => entry.driverNumber === current.driverNumber) ?? null : null);
  }, [snapshot.entries]);

  const isNoLiveSession = !isReplayMode && connectionState === 'DISCONNECTED';
  const isProviderUnavailable = !isReplayMode && connectionState === 'PROVIDER_UNAVAILABLE';
  const isLiveOffline = !isReplayMode && (isNoLiveSession || isProviderUnavailable || connectionState === 'ERROR' || connectionState === 'STALE' || snapshot.entries.length === 0);

  const completedLaps = getCompletedLaps ? getCompletedLaps(snapshot.currentLap) : [];

  return (
    <div className="f1-race-control-screen">
      <FlagStatusBanner trackStatus={snapshot.trackStatus} />

      {isReplayMode && <ReplayController currentLap={snapshot.currentLap} totalLaps={snapshot.totalLaps} isPlaying={isReplayPlaying} playbackSpeed={replaySpeed} onPlay={onPlayReplay} onPause={onPauseReplay} onStepLap={onStepReplay} onSetSpeed={onSetReplaySpeed} onJumpToLap={onJumpReplayLap} sessionName={snapshot.sessionName || 'RECORDED SESSION'} circuitName={snapshot.circuitName || 'CIRCUIT —'} />}

      {favoriteTeam && <section className="f1-team-focus" style={{ borderLeftColor: favoriteTeam.color }}><div><div className="f1-team-focus-kicker">YOUR TEAM</div><div className="f1-team-focus-name">{favoriteTeam.name}</div><div className="f1-team-focus-meta">{favoriteTeam.powerUnit} · {favoriteTeam.base}</div></div><div className="f1-team-focus-stats"><div><span>CHAMPIONSHIP</span><strong>P{favoriteTeam.position ?? '—'}</strong></div><div><span>POINTS</span><strong>{favoriteTeam.points ?? '—'}</strong></div><div><span>WINS</span><strong>{favoriteTeam.wins ?? 0}</strong></div><div><span>DRIVERS</span><strong>{favoriteTeam.drivers?.join(' / ') || '—'}</strong></div></div>{favoriteEntries.length > 0 && <div className="f1-team-ontrack">{favoriteEntries.map(entry => <div key={entry.driverNumber}><span className="f1-team-ontrack-driver">{entry.driverCode}</span><span>P{entry.position}</span><span>{entry.gap}</span><span>{entry.tyre.compound} {entry.tyre.age}L</span></div>)}</div>}</section>}

      {isLiveOffline && <div className="f1-provider-state"><div><div className="f1-provider-title">{isNoLiveSession ? 'NO LIVE SESSION' : isProviderUnavailable ? 'PROVIDER UNAVAILABLE' : 'LIVE TIMING NOT AVAILABLE'}</div><div className="f1-provider-copy">{isNoLiveSession ? 'There is no scheduled on-track session right now. This is not a provider outage.' : isProviderUnavailable ? 'The live timing proxy could not be reached for the scheduled session. No timing values are fabricated.' : 'No current on-track timing snapshot has been received. No timing values are fabricated.'}</div></div><div className="f1-provider-actions">{!isNoLiveSession && <button type="button" onClick={onConnectLive}><RefreshCw className="w-3 h-3" /> RETRY LIVE</button>}<button type="button" onClick={onSwitchToReplay}>OPEN RECORDED REPLAY</button></div></div>}

      {snapshot.entries.length > 0 && (
        <PerformanceInsights
          snapshot={snapshot}
          driverStandings={driverStandings}
          favoriteTeam={favoriteTeam}
          favoriteDriverNumber={selectedDriver?.driverNumber}
          onSelectFavoriteDriver={driverNum => {
            const entry = snapshot.entries.find(e => e.driverNumber === driverNum);
            if (entry) setSelectedDriver(entry);
          }}
          completedLaps={completedLaps}
          onSelectDriver={entry => setSelectedDriver(entry)}
        />
      )}

      {snapshot.entries.length > 0 && <div className="f1-live-workspace">
        <section className="f1-timing-primary" aria-label="Formula 1 Timing Table">
          <div className="f1-section-heading"><span>LIVE TIMING</span><span>{snapshot.entries.length} CARS</span></div>
          <div className="f1-timing-context"><span className="f1-fastest-lap">{snapshot.fastestLap ? <>FASTEST <strong>{snapshot.fastestLap.driverCode}</strong> {snapshot.fastestLap.time} · L{snapshot.fastestLap.lap}</> : 'FASTEST LAP —'}</span></div>
          <details className="f1-timing-guide"><summary>TIMING GUIDE <span>What do these numbers mean?</span></summary><div className="f1-timing-guide-grid"><div><strong>Gap to leader</strong><span>Time behind P1</span></div><div><strong>Interval</strong><span>Time behind the car ahead</span></div><div><strong>Last lap</strong><span>Most recent completed lap</span></div><div><strong>Best lap</strong><span>Fastest lap of the session</span></div><div><strong>Sector 1–3</strong><span>Times for each part of the lap</span></div><div><strong>Tyre / age</strong><span>Compound and laps on this set</span></div></div></details>
          <TimingTable entries={snapshot.entries} selectedDriver={selectedDriver} onSelectDriver={entry => setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry)} />
        </section>
        <aside className="f1-race-side"><section className="f1-side-block" aria-label="Gap tracker"><div className="f1-section-heading"><span>GAP / INTERVAL</span><span>LAP {snapshot.currentLap || '—'}</span></div><MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} /></section><section className="f1-side-block" aria-label="Race control"><RaceControlFeed messages={snapshot.raceControl} /></section></aside>
      </div>}

      {selectedDriver && snapshot.entries.length > 0 && <section aria-label="Driver Telemetry Detail"><DriverTelemetryDrawer entry={selectedDriver} onClose={() => setSelectedDriver(null)} /></section>}
      {snapshot.entries.length === 0 && <section aria-label="Race Control Event Feed" className="f1-race-control-empty"><RaceControlFeed messages={snapshot.raceControl} /></section>}
    </div>
  );
};
