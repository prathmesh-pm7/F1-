import React, { useState } from 'react';
import { LiveSessionSnapshot, TimingEntry, LiveConnectionState } from '../../types/f1';
import { FlagStatusBanner } from '../race-control/FlagStatusBanner';
import { TimingTable } from './TimingTable';
import { DriverTelemetryDrawer } from './DriverTelemetryDrawer';
import { MiniGapTracker } from './MiniGapTracker';
import { ReplayController } from './ReplayController';
import { RaceControlFeed } from '../race-control/RaceControlFeed';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';
import { EmptyState } from '../shared/EmptyState';
import { Radio, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface Props {
  snapshot: LiveSessionSnapshot;
  connectionState: LiveConnectionState;
  isReplayMode: boolean;
  onPlayReplay: () => void;
  onPauseReplay: () => void;
  onStepReplay: (delta: number) => void;
  onSetReplaySpeed: (speed: number) => void;
  onJumpReplayLap: (lap: number) => void;
  isReplayPlaying: boolean;
  replaySpeed: number;
  onConnectLive: () => void;
}

export const LiveTimingWorkstation: React.FC<Props> = ({
  snapshot,
  connectionState,
  isReplayMode,
  onPlayReplay,
  onPauseReplay,
  onStepReplay,
  onSetReplaySpeed,
  onJumpReplayLap,
  isReplayPlaying,
  replaySpeed,
  onConnectLive
}) => {
  const [selectedDriver, setSelectedDriver] = useState<TimingEntry | null>(snapshot.entries[0] || null);

  const handleSelectDriver = (entry: TimingEntry) => {
    setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry);
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Track Status Banner */}
      <FlagStatusBanner trackStatus={snapshot.trackStatus} />

      {/* 2. Replay Controller (if in Replay mode) or Live Unavailable Alert */}
      {isReplayMode ? (
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
      ) : connectionState === 'PROVIDER_UNAVAILABLE' || connectionState === 'DISCONNECTED' ? (
        <div className="border border-[#242c37] bg-[#111418] p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-neutral-400" />
            <div>
              <span className="font-bold text-neutral-200 uppercase">LIVE DATA UNAVAILABLE</span>
              <span className="text-neutral-400 ml-2">
                No official Formula 1 track session is active right now.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnectLive}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1a2028] border border-[#2e3744] hover:bg-[#252c38] text-neutral-200"
          >
            <RefreshCw className="w-3 h-3" />
            <span>CHECK SIGNALR FEED</span>
          </button>
        </div>
      ) : null}

      {/* 3. Top Session Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="text-white font-bold">{snapshot.sessionName}</span>
          <span className="text-neutral-600">/</span>
          <span>{snapshot.circuitName}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-emerald-400 font-semibold">{snapshot.entries.length} CARS CLASSIFIED</span>
        </div>

        {snapshot.fastestLap && (
          <div className="flex items-center gap-1.5 text-neutral-300">
            <span className="text-[10px] text-fuchsia-400 font-bold uppercase">FASTEST LAP:</span>
            <span className="text-fuchsia-400 font-bold timing-cell">{snapshot.fastestLap.time}</span>
            <span className="text-neutral-400">({snapshot.fastestLap.driverCode} - LAP {snapshot.fastestLap.lap})</span>
          </div>
        )}
      </div>

      {/* 4. Mini Gap / Pace Tracker */}
      <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />

      {/* 5. Main Timing Table (Dominates the page) */}
      <section aria-label="Formula 1 Timing Table">
        <TimingTable
          entries={snapshot.entries}
          selectedDriver={selectedDriver}
          onSelectDriver={handleSelectDriver}
        />
      </section>

      {/* 6. Selected Driver Telemetry Drawer / Inspection panel */}
      {selectedDriver && (
        <section aria-label="Driver Telemetry Detail">
          <DriverTelemetryDrawer
            entry={selectedDriver}
            onClose={() => setSelectedDriver(null)}
          />
        </section>
      )}

      {/* 7. Race Control Feed */}
      <section aria-label="Race Control Event Feed">
        <RaceControlFeed messages={snapshot.raceControl} />
      </section>

      {/* 8. Provenance Footer */}
      <div className="pt-2 border-t border-[#1c222b]">
        <ProvenanceBadge provenance={snapshot.provenance} />
      </div>
    </div>
  );
};
