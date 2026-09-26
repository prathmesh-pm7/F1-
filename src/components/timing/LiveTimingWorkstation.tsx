import React, { useState } from 'react';
import { LiveSessionSnapshot, TimingEntry, LiveConnectionState, Team } from '../../types/f1';
import { FlagStatusBanner } from '../race-control/FlagStatusBanner';
import { TimingTable } from './TimingTable';
import { DriverTelemetryDrawer } from './DriverTelemetryDrawer';
import { MiniGapTracker } from './MiniGapTracker';
import { ReplayController } from './ReplayController';
import { RaceControlFeed } from '../race-control/RaceControlFeed';
import { RefreshCw } from 'lucide-react';

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
}

export const LiveTimingWorkstation: React.FC<Props> = ({
  snapshot, connectionState, isReplayMode, favoriteTeam, onPlayReplay, onPauseReplay,
  onStepReplay, onSetReplaySpeed, onJumpReplayLap, isReplayPlaying, replaySpeed,
  onConnectLive, onSwitchToReplay
}) => {
  const [selectedDriver, setSelectedDriver] = useState<TimingEntry | null>(snapshot.entries[0] || null);
  const favoriteEntries = favoriteTeam
    ? snapshot.entries.filter(entry => entry.teamName === favoriteTeam.name || entry.teamName === favoriteTeam.fullName)
    : [];
  const isLiveOffline = !isReplayMode && snapshot.entries.length === 0;

  return (
    <div className="f1-race-control-screen">
      <div className="f1-live-strip">
        <div className="f1-live-strip-main">
          <span className="f1-live-kicker">LIVE TIMING</span>
          <span className="f1-live-session">{snapshot.sessionName || 'SESSION'}</span>
          <span className="f1-live-circuit">{snapshot.circuitName || 'CIRCUIT —'}</span>
        </div>
        <div className="f1-live-strip-meta">
          <span>{snapshot.currentLap > 0 ? `LAP ${snapshot.currentLap}/${snapshot.totalLaps || '—'}` : 'LAP —/—'}</span>
          <span className={connectionState === 'LIVE' ? 'is-live' : ''}>{connectionState === 'LIVE' ? 'LIVE' : connectionState}</span>
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
            <div className="f1-provider-title">LIVE TIMING NOT AVAILABLE</div>
            <div className="f1-provider-copy">No current on-track timing snapshot has been received. No timing values are fabricated.</div>
          </div>
          <div className="f1-provider-actions">
            <button type="button" onClick={onConnectLive}><RefreshCw className="w-3 h-3" /> RETRY LIVE</button>
            <button type="button" onClick={onSwitchToReplay}>OPEN RECORDED REPLAY</button>
          </div>
        </div>
      )}

      <div className="f1-session-line">
        <div>
          <strong>{snapshot.sessionName || 'SESSION'}</strong>
          <span>/</span>
          <span>{snapshot.circuitName || 'CIRCUIT —'}</span>
          <span>/</span>
          <span>{snapshot.entries.length ? `${snapshot.entries.length} CARS` : 'NO TIMING SNAPSHOT'}</span>
        </div>
        {snapshot.fastestLap && (
          <div>
            <span>FASTEST</span>
            <strong>{snapshot.fastestLap.time}</strong>
            <span>{snapshot.fastestLap.driverCode} · L{snapshot.fastestLap.lap}</span>
          </div>
        )}
      </div>

      {snapshot.entries.length > 0 && (
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