import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  currentLap: number;
  totalLaps: number;
  recordedLaps?: number[];
  sessionName?: string;
  circuitName?: string;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepLap: (delta: number) => void;
  onSetSpeed: (speed: number) => void;
  onJumpToLap: (lap: number) => void;
}

export const ReplayController: React.FC<Props> = ({
  currentLap,
  totalLaps,
  recordedLaps = [36, 37, 38, 39, 40],
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStepLap,
  onSetSpeed,
  onJumpToLap,
  sessionName = 'RECORDED SESSION',
  circuitName = 'CIRCUIT'
}) => {
  const laps = recordedLaps?.length ? recordedLaps : Array.from({ length: totalLaps }, (_, i) => i + 1);
  const minLap = laps[0] ?? 1;
  const maxLap = laps[laps.length - 1] ?? totalLaps;

  return (
    <div className="f1-replay-controller border border-amber-900/60 bg-[#12110d] px-3 py-2 text-xs text-neutral-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Replay Notice Label */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>REPLAY / HISTORICAL DATA</span>
          </div>
          <span className="text-neutral-400 text-[11px] hidden sm:inline">
            RECORDED TIMING · {sessionName} · {circuitName} · LAPS {minLap}-{maxLap}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Step Back */}
          <button
            type="button"
            onClick={() => onStepLap(-1)}
            disabled={currentLap <= minLap}
            className="p-1.5 bg-[#1a1c22] border border-[#2e3744] hover:bg-[#252c38] disabled:opacity-30 disabled:pointer-events-none text-neutral-200"
            title="Previous Recorded Lap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold border transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400'
                : 'bg-[#1e2530] text-amber-300 border-amber-600/60 hover:bg-[#293240]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={() => onStepLap(1)}
            disabled={currentLap >= maxLap}
            className="p-1.5 bg-[#1a1c22] border border-[#2e3744] hover:bg-[#252c38] disabled:opacity-30 disabled:pointer-events-none text-neutral-200"
            title="Next Recorded Lap"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Recorded Lap Buttons */}
          <div className="flex items-center border border-[#2e3744] bg-[#161a20]">
            {laps.map((lap) => (
              <button
                key={lap}
                type="button"
                onClick={() => onJumpToLap(lap)}
                className={`px-2 py-1 text-[11px] font-bold ${
                  currentLap === lap
                    ? 'bg-amber-500/20 text-amber-300 border-r border-amber-500/40 last:border-r-0'
                    : 'text-neutral-400 hover:text-white border-r border-[#2e3744] last:border-r-0'
                }`}
              >
                L{lap}
              </button>
            ))}
          </div>

          {/* Speed Selectors */}
          <div className="flex items-center border border-[#2e3744] bg-[#161a20]">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onSetSpeed(speed)}
                className={`px-2 py-1 text-[11px] font-bold ${
                  playbackSpeed === speed
                    ? 'bg-amber-500/20 text-amber-300 border-r border-amber-500/40 last:border-r-0'
                    : 'text-neutral-400 hover:text-white border-r border-[#2e3744] last:border-r-0'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onJumpToLap(minLap)}
            className="p-1.5 bg-[#161a20] border border-[#2e3744] hover:bg-[#252c38] text-neutral-400 hover:text-white"
            title={`Reset to Lap ${minLap}`}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
