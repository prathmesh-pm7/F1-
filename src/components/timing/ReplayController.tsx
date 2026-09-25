import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  currentLap: number;
  totalLaps: number;
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
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStepLap,
  onSetSpeed,
  onJumpToLap
}) => {
  return (
    <div className="border border-amber-900/60 bg-[#12110d] px-3 py-2 text-xs font-mono text-neutral-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Replay Notice Label */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>REPLAY / HISTORICAL FIXTURE DATA</span>
          </div>
          <span className="text-neutral-400 text-[11px] hidden sm:inline">
            FIA Official Timing Record · Italian GP (Monza 2024)
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Step Back */}
          <button
            type="button"
            onClick={() => onStepLap(-1)}
            disabled={currentLap <= 35}
            className="p-1.5 bg-[#1a1c22] border border-[#2e3744] hover:bg-[#252c38] disabled:opacity-30 disabled:pointer-events-none text-neutral-200"
            title="Step Back 1 Lap"
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
            disabled={currentLap >= totalLaps}
            className="p-1.5 bg-[#1a1c22] border border-[#2e3744] hover:bg-[#252c38] disabled:opacity-30 disabled:pointer-events-none text-neutral-200"
            title="Step Forward 1 Lap"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

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

          {/* Reset to Start of stint */}
          <button
            type="button"
            onClick={() => onJumpToLap(38)}
            className="p-1.5 bg-[#161a20] border border-[#2e3744] hover:bg-[#252c38] text-neutral-400 hover:text-white"
            title="Reset to Lap 38 (Piastri Pit Exit)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress timeline */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-neutral-400 w-12">LAP {currentLap}</span>
        <input
          type="range"
          min={35}
          max={53}
          value={currentLap}
          onChange={(e) => onJumpToLap(parseInt(e.target.value, 10))}
          className="flex-1 h-1 bg-[#222933] appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-[10px] text-neutral-400 w-12 text-right">LAP {totalLaps}</span>
      </div>
    </div>
  );
};
