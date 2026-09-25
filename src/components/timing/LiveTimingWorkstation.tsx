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
  onSwitchToReplay: () => void;
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
  onConnectLive,
  onSwitchToReplay
}) => {
  const [selectedDriver, setSelectedDriver] = useState<TimingEntry | null>(snapshot.entries[0] || null);

  const handleSelectDriver = (entry: TimingEntry) => {
    setSelectedDriver(selectedDriver?.driverCode === entry.driverCode ? null : entry);
  };

  const isLiveOffline = !isReplayMode && snapshot.entries.length === 0;

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Track Status Banner */}
      <FlagStatusBanner trackStatus={snapshot.trackStatus} />

      {/* 2. Replay Controller (if in Replay mode) */}
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

      {/* 3. Live Telemetry Offline / Dormant Panel */}
      {isLiveOffline && (
        <div className="border border-[#242c37] bg-[#111418] p-5 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c222b] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-neutral-500 rounded-full animate-pulse" />
              <div>
                <h3 className="font-bold text-white text-sm tracking-wide uppercase">
                  LIVE TELEMETRY STREAM DORMANT (NO ON-TRACK SESSION)
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5 font-sans">
                  The official Formula 1 timing server transmits live telemetry strictly while cars are active on track.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSwitchToReplay}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/50 hover:bg-amber-500/20 text-amber-300 font-bold tracking-wide uppercase transition-colors"
              >
                <span>LOAD MONZA 2024 RACE REPLAY</span>
              </button>
              <button
                type="button"
                onClick={onConnectLive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2028] border border-[#2e3744] hover:bg-[#252c38] text-neutral-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>POLL SIGNALR</span>
              </button>
            </div>
          </div>

          {/* Diagnostic telemetry details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="border border-[#1f2632] bg-[#0e1115] p-3 space-y-2 text-xs">
              <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                SIGNALR TELEMETRY LINK
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">HUB ENDPOINT:</span>
                <span className="text-neutral-200">wss://livetiming.formula1.com/signalrcore</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">PROTOCOL:</span>
                <span className="text-neutral-200">SignalR JSON Protocol v1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">SUBSCRIPTION STATUS:</span>
                <span className="text-sky-400 font-bold">{connectionState}</span>
              </div>
            </div>

            <div className="border border-[#1f2632] bg-[#0e1115] p-3 space-y-2 text-xs">
              <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                DATA INTEGRITY POLICY
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">SYNTHETIC TIMING:</span>
                <span className="text-emerald-400 font-bold">STRICTLY DISABLED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">INTERPOLATION:</span>
                <span className="text-emerald-400 font-bold">PROHIBITED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">HISTORICAL ARCHIVE:</span>
                <span className="text-amber-400 font-bold">2024 MONZA (5 LAPS RECORDED)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Top Session Summary Bar */}
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

      {/* 5. Mini Gap / Pace Tracker (when entries exist) */}
      {snapshot.entries.length > 0 && (
        <MiniGapTracker entries={snapshot.entries} currentLap={snapshot.currentLap} />
      )}

      {/* 6. Main Timing Table (Dominates the page when entries exist) */}
      {snapshot.entries.length > 0 && (
        <section aria-label="Formula 1 Timing Table">
          <TimingTable
            entries={snapshot.entries}
            selectedDriver={selectedDriver}
            onSelectDriver={handleSelectDriver}
          />
        </section>
      )}

      {/* 7. Selected Driver Telemetry Drawer / Inspection panel */}
      {selectedDriver && snapshot.entries.length > 0 && (
        <section aria-label="Driver Telemetry Detail">
          <DriverTelemetryDrawer
            entry={selectedDriver}
            onClose={() => setSelectedDriver(null)}
          />
        </section>
      )}

      {/* 8. Race Control Feed */}
      <section aria-label="Race Control Event Feed">
        <RaceControlFeed messages={snapshot.raceControl} />
      </section>

      {/* 9. Provenance Footer */}
      <div className="pt-2 border-t border-[#1c222b]">
        <ProvenanceBadge provenance={snapshot.provenance} />
      </div>
    </div>
  );
};
