import React, { useState } from 'react';
import { LiveSessionSnapshot, TimingEntry, LiveConnectionState, Team } from '../../types/f1';
import { FlagStatusBanner } from '../race-control/FlagStatusBanner';
import { TimingTable } from './TimingTable';
import { DriverTelemetryDrawer } from './DriverTelemetryDrawer';
import { MiniGapTracker } from './MiniGapTracker';
import { ReplayController } from './ReplayController';
import { RaceControlFeed } from '../race-control/RaceControlFeed';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';
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
  const favoriteEntries = favoriteTeam ? snapshot.entries.filter(entry => entry.teamName === favoriteTeam.name || entry.teamName === favoriteTeam.fullName) : [];
  const isLiveOffline = !isReplayMode && snapshot.entries.length === 0;

  return (
    <div className="space-y-3 pb-8">
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
            <div className="f1-provider-copy">No current on-track timing snapshot has been received. The connection state is shown above; no timing values are fabricated.</div>
          </div>
          <div className="f1-provider-actions">
            <button type="button" onClick={onConnectLive}><RefreshCw className="w-3 h-3" /> RETRY LIVE</button>
            <button type="button" onClick={onSwitchToReplay}>OPEN RECORDED REPLAY</button>
          </div>
        </div>
      )}

      <div className="f1-session-line">
        <div><strong>{snapshot.sessionName}</strong><span>/</span><span>{snapshot.circuitName}</span><span>/</span><span>{snapshot.entries.length ? `${snapshot.entries.length} CARS CLASSIFIED` : 'NO TIMING SNAPSHOT'}</span></div>
        {snapshot.fastestLap && <div><span>FASTEST</span><strong>{snapshot.fastestLap.time}</strong><span>{snapshot.fastestLap.driverCode} · L{snapshot.fastestLap.lap}</span></div>}
      </div>

      {snapshot.entries.length > 0 && <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />}
      {snapshot.entries.length > 0 && (
        <section aria-label="Formula 1 Timing Table">
          <TimingTable
            entries={snapshot.entries}
            selectedDriver={selectedDriver}
            onSelectDriver={(entry) => setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry)}
          />
        </section>
      )}

      {selectedDriver && snapshot.entries.length > 0 && (
        <section aria-label="Driver Telemetry Detail">
          <DriverTelemetryDrawer entry={selectedDriver} onClose={() => setSelectedDriver(null)} />
        </section>
      )}

      <section aria-label="Race Control Event Feed"><RaceControlFeed messages={snapshot.raceControl} /></section>
      <div className="pt-2 border-t border-[#1c222b]"><ProvenanceBadge provenance={snapshot.provenance} /></div>
    </div>
  );
};