import React, { useEffect, useState } from 'react';
import { LiveSessionSnapshot, TimingEntry, LiveConnectionState, Team } from '../../types/f1';
import { FlagStatusBanner } from '../race-control/FlagStatusBanner';
import { TimingTable } from './TimingTable';
import { DriverTelemetryDrawer } from './DriverTelemetryDrawer';
import { MiniGapTracker } from './MiniGapTracker';
import { ReplayController } from './ReplayController';
import { RaceControlFeed } from '../race-control/RaceControlFeed';
import { TrackMapVisualizer } from './TrackMapVisualizer';
import { MiniTrackRadar } from './MiniTrackRadar';
import { RefreshCw, LayoutGrid, Map, Table } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  isReplayMode: boolean;
  favoriteTeam: Team | null;
  onPlayReplay: () => void;
  onPauseReplay: () => void;
  onStepReplay: (delta: number) => void;
  onSetReplaySpeed: (speed: number) => void;
  onJumpReplayLap: (lap: number) => void;
  isReplayPlaying: boolean;
  replaySpeed: number;
  onConnectLive: () => void;
  onSwitchToReplay: () => void;
  sessionContext: { sessionName: string; circuitName: string } | null;
  circuitInfoUrl?: string;
}

export const LiveTimingWorkstation: React.FC<Props> = ({
  snapshot, connectionState, isReplayMode, favoriteTeam, onPlayReplay, onPauseReplay,
  onStepReplay, onSetReplaySpeed, onJumpReplayLap, isReplayPlaying, replaySpeed,
  onConnectLive, onSwitchToReplay, sessionContext, circuitInfoUrl
}) => {
  const [selectedDriver, setSelectedDriver] = useState<TimingEntry | null>(snapshot.entries[0] || null);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'MAP' | 'TABLE'>('SPLIT');

  const favoriteEntries = favoriteTeam
    ? snapshot.entries.filter(entry => entry.teamName === favoriteTeam.name || entry.teamName === favoriteTeam.fullName)
    : [];
  useEffect(() => {
    setSelectedDriver(current => {
      if (!current) return null;
      return snapshot.entries.find(entry => entry.driverNumber === current.driverNumber) ?? null;
    });
  }, [snapshot.entries]);

  const displaySessionName = snapshot.sessionName || sessionContext?.sessionName || 'SESSION';
  const displayCircuitName = snapshot.circuitName || sessionContext?.circuitName || 'CIRCUIT —';
  const isNoLiveSession = !isReplayMode && connectionState === 'DISCONNECTED' && !sessionContext;
  const isProviderUnavailable = !isReplayMode && connectionState === 'PROVIDER_UNAVAILABLE';
  const isLiveOffline = !isReplayMode && (
    isNoLiveSession ||
    isProviderUnavailable ||
    connectionState === 'ERROR' ||
    connectionState === 'STALE' ||
    snapshot.entries.length === 0
  );

  return (
    <div className="f1-race-control-screen">
      <div className="f1-live-strip">
        <div className="f1-live-strip-main">
          <span className="f1-live-kicker">LIVE TIMING</span>
          <span className="f1-live-session">{displaySessionName}</span>
          <span className="f1-live-circuit">{displayCircuitName}</span>
        </div>
        <div className="f1-live-strip-meta">
          <span>{snapshot.currentLap > 0 ? `LAP ${snapshot.currentLap}/${snapshot.totalLaps || '—'}` : 'LAP —/—'}</span>
          <span className={connectionState === 'LIVE' ? 'is-live' : ''}>
            {isNoLiveSession ? 'NO LIVE SESSION' : connectionState === 'PROVIDER_UNAVAILABLE' ? 'PROVIDER UNAVAILABLE' : connectionState === 'LIVE' ? 'LIVE' : connectionState}
          </span>
        </div>
      </div>

      <FlagStatusBanner trackStatus={snapshot.trackStatus} />

      {isReplayMode && (
        <ReplayController
          currentLap={snapshot.currentLap}
          totalLaps={snapshot.totalLaps}
          isPlaying={isReplayPlaying}
          playbackSpeed={replaySpeed}
          onPlay={onPlayReplay}
          onPause={onPauseReplay}
          onStepLap={onStepReplay}
          onSetSpeed={onSetReplaySpeed}
          onJumpToLap={onJumpReplayLap}
          sessionName={displaySessionName}
          circuitName={displayCircuitName}
        />
      )}

      {favoriteTeam && (
        <section className="f1-team-focus" style={{ borderLeftColor: favoriteTeam.color }}>
          <div>
            <div className="f1-team-focus-kicker">YOUR TEAM</div>
            <div className="f1-team-focus-name">{favoriteTeam.name}</div>
            <div className="f1-team-focus-meta">{favoriteTeam.powerUnit} · {favoriteTeam.base}</div>
          </div>
          <div className="f1-team-focus-stats">
            <div><span>CHAMPIONSHIP</span><strong>P{favoriteTeam.position ?? '—'}</strong></div>
            <div><span>POINTS</span><strong>{favoriteTeam.points ?? '—'}</strong></div>
            <div><span>WINS</span><strong>{favoriteTeam.wins ?? 0}</strong></div>
            <div><span>DRIVERS</span><strong>{favoriteTeam.drivers?.join(' / ') || '—'}</strong></div>
          </div>
          {favoriteEntries.length > 0 && (
            <div className="f1-team-ontrack">
              {favoriteEntries.map(entry => (
                <div key={entry.driverNumber}>
                  <span className="f1-team-ontrack-driver">{entry.driverCode}</span>
                  <span>P{entry.position}</span>
                  <span>{entry.gap}</span>
                  <span>{entry.tyre.compound} {entry.tyre.age}L</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isLiveOffline && (
        <div className="f1-provider-state">
          <div>
            <div className="f1-provider-title">
              {isNoLiveSession ? 'NO LIVE SESSION' : isProviderUnavailable ? 'PROVIDER UNAVAILABLE' : 'LIVE TIMING NOT AVAILABLE'}
            </div>
            <div className="f1-provider-copy">
              {isNoLiveSession
                ? 'There is no scheduled on-track session right now. This is not a provider outage.'
                : isProviderUnavailable
                  ? 'The live timing provider could not be reached for the scheduled session. No timing values are fabricated.'
                  : 'No current on-track timing snapshot has been received. No timing values are fabricated.'}
            </div>
          </div>
          <div className="f1-provider-actions">
            {!isNoLiveSession && <button type="button" onClick={onConnectLive}><RefreshCw className="w-3 h-3" /> RETRY LIVE</button>}
            <button type="button" onClick={onSwitchToReplay}>OPEN RECORDED REPLAY</button>
          </div>
        </div>
      )}

      <div className="f1-session-line">
        <div className="flex items-center gap-3">
          <strong>{displaySessionName}</strong>
          <span>/</span>
          <span>{displayCircuitName}</span>
          <span>/</span>
          <span>{snapshot.entries.length ? `${snapshot.entries.length} CARS` : 'NO TIMING SNAPSHOT'}</span>
        </div>

        <div className="flex items-center gap-3">
          {snapshot.entries.length > 0 && (
            <div className="f1-view-mode-selector" role="group" aria-label="Workstation View Mode">
              <button
                type="button"
                className={`f1-view-mode-btn ${viewMode === 'SPLIT' ? 'is-active' : ''}`}
                onClick={() => setViewMode('SPLIT')}
                title="Split View: Timing Table + 2D Track Map"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>SPLIT VIEW</span>
              </button>
              <button
                type="button"
                className={`f1-view-mode-btn ${viewMode === 'MAP' ? 'is-active' : ''}`}
                onClick={() => setViewMode('MAP')}
                title="Full 2D Track Map Radar"
              >
                <Map className="w-3.5 h-3.5" />
                <span>TRACK MAP</span>
              </button>
              <button
                type="button"
                className={`f1-view-mode-btn ${viewMode === 'TABLE' ? 'is-active' : ''}`}
                onClick={() => setViewMode('TABLE')}
                title="Timing Table View"
              >
                <Table className="w-3.5 h-3.5" />
                <span>TABLE</span>
              </button>
            </div>
          )}

          {snapshot.fastestLap && (
            <div className="hidden sm:flex items-center gap-2">
              <span>FASTEST</span>
              <strong>{snapshot.fastestLap.time}</strong>
              <span>{snapshot.fastestLap.driverCode} · L{snapshot.fastestLap.lap}</span>
            </div>
          )}
        </div>
      </div>

      {snapshot.entries.length > 0 && (
        <>
          <details className="f1-timing-guide mb-3">
            <summary>TIMING GUIDE <span>What do these numbers mean?</span></summary>
            <div className="f1-timing-guide-grid">
              <div><strong>Gap to leader</strong><span>Time behind P1</span></div>
              <div><strong>Interval</strong><span>Time behind the car ahead</span></div>
              <div><strong>Last lap</strong><span>Most recent completed lap</span></div>
              <div><strong>Best lap</strong><span>Fastest lap of the session</span></div>
              <div><strong>Sector 1–3</strong><span>Times for each part of the lap</span></div>
              <div><strong>Tyre / age</strong><span>Compound and laps on this set</span></div>
            </div>
          </details>

          {/* VIEW MODE 1: SPLIT VIEW (TIMING TABLE + TRACK MAP) */}
          {viewMode === 'SPLIT' && (
            <div className="f1-split-workspace">
              {/* Left Column: Timing Table */}
              <section className="f1-timing-primary" aria-label="Formula 1 Timing Table">
                <div className="f1-section-heading">
                  <span>LIVE TIMING</span>
                  <span>{snapshot.entries.length} CARS</span>
                </div>
                <TimingTable
                  entries={snapshot.entries}
                  selectedDriver={selectedDriver}
                  onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry)}
                />
              </section>

              {/* Right Column: 2D Track Map Visualizer & Live Feeds */}
              <div className="space-y-3">
                <TrackMapVisualizer
                  snapshot={snapshot}
                  selectedDriver={selectedDriver}
                  onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry?.driverCode ? null : entry)}
                  favoriteTeam={favoriteTeam}
                  circuitInfoUrl={circuitInfoUrl}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <section className="f1-side-block" aria-label="Gap tracker">
                    <div className="f1-section-heading"><span>GAP / INTERVAL</span><span>LAP {snapshot.currentLap || '—'}</span></div>
                    <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />
                  </section>
                  <section className="f1-side-block" aria-label="Race control">
                    <RaceControlFeed messages={snapshot.raceControl} />
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: FULL TRACK MAP */}
          {viewMode === 'MAP' && (
            <div className="f1-map-workspace">
              <div className="space-y-3">
                <TrackMapVisualizer
                  snapshot={snapshot}
                  selectedDriver={selectedDriver}
                  onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry?.driverCode ? null : entry)}
                  favoriteTeam={favoriteTeam}
                  circuitInfoUrl={circuitInfoUrl}
                />

                <section className="f1-timing-primary" aria-label="Formula 1 Timing Table">
                  <div className="f1-section-heading">
                    <span>LIVE TIMING CLASSIFICATION</span>
                    <span>{snapshot.entries.length} CARS</span>
                  </div>
                  <TimingTable
                    entries={snapshot.entries}
                    selectedDriver={selectedDriver}
                    onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry)}
                  />
                </section>
              </div>

              <aside className="f1-race-side">
                <section className="f1-side-block" aria-label="Gap tracker">
                  <div className="f1-section-heading"><span>GAP / INTERVAL</span><span>LAP {snapshot.currentLap || '—'}</span></div>
                  <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />
                </section>
                <section className="f1-side-block" aria-label="Race control">
                  <RaceControlFeed messages={snapshot.raceControl} />
                </section>
              </aside>
            </div>
          )}

          {/* VIEW MODE 3: CLASSIC TIMING TABLE */}
          {viewMode === 'TABLE' && (
            <div className="f1-live-workspace">
              <section className="f1-timing-primary" aria-label="Formula 1 Timing Table">
                <div className="f1-section-heading">
                  <span>LIVE TIMING</span>
                  <span>{snapshot.entries.length} CARS</span>
                </div>
                <TimingTable
                  entries={snapshot.entries}
                  selectedDriver={selectedDriver}
                  onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry)}
                />
              </section>

              <aside className="f1-race-side">
                <section className="f1-side-block" aria-label="2D Track Radar">
                  <MiniTrackRadar
                    snapshot={snapshot}
                    selectedDriver={selectedDriver}
                    onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry?.driverCode ? null : entry)}
                    circuitInfoUrl={circuitInfoUrl}
                    onExpandToFullMap={() => setViewMode('MAP')}
                  />
                </section>
                <section className="f1-side-block" aria-label="Gap tracker">
                  <div className="f1-section-heading"><span>GAP / INTERVAL</span><span>LAP {snapshot.currentLap || '—'}</span></div>
                  <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />
                </section>
                <section className="f1-side-block" aria-label="Race control">
                  <RaceControlFeed messages={snapshot.raceControl} />
                </section>
              </aside>
            </div>
          )}
        </>
      )}

      {selectedDriver && snapshot.entries.length > 0 && (
        <section aria-label="Driver Telemetry Detail">
          <DriverTelemetryDrawer entry={selectedDriver} onClose={() => setSelectedDriver(null)} />
        </section>
      )}

      {snapshot.entries.length === 0 && (
        <section aria-label="Race Control Event Feed" className="f1-race-control-empty">
          <RaceControlFeed messages={snapshot.raceControl} />
        </section>
      )}
    </div>
  );
};