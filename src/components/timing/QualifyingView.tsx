import React, { useState, useMemo } from 'react';
import { TimingEntry, SectorTime, TyreCompound } from '../../types/f1';
import { formatGap } from '../../utils/timingFormat';
import { Trophy, Timer, Zap, Flag, ChevronRight, AlertCircle, Layers } from 'lucide-react';

export type QualifyingPhase = 'Q1' | 'Q2' | 'Q3' | 'ALL';

interface Props {
  entries: TimingEntry[];
  selectedDriver: TimingEntry | null;
  onSelectDriver: (entry: TimingEntry) => void;
  fastestLap?: { driverCode: string; time: string; lap: number };
  circuitName?: string;
  sessionName?: string;
  className?: string;
}

export interface QualifyingDriverRow {
  position: number;
  entry: TimingEntry;
  q1Time?: string;
  q2Time?: string;
  q3Time?: string;
  bestLapTime: string;
  bestLapSeconds: number;
  gapToP1: string;
  gapToP1Seconds: number;
  gapToCutoff?: string;
  sector1: SectorTime;
  sector2: SectorTime;
  sector3: SectorTime;
  isOverallFastest: boolean;
  isPhaseFastest: boolean;
  isEliminated: boolean;
  eliminationPhase?: 'Q1' | 'Q2';
  lapsInPhase: number;
  tyreCompound: TyreCompound;
  tyreAge: number;
}

export function parseLapSeconds(lapTimeStr?: string): number | null {
  if (!lapTimeStr || lapTimeStr === '—' || lapTimeStr.trim() === '') return null;
  const clean = lapTimeStr.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      if (Number.isFinite(mins) && Number.isFinite(secs)) {
        return mins * 60 + secs;
      }
    }
  }
  const s = parseFloat(clean);
  return Number.isFinite(s) && s > 0 ? s : null;
}

export function secondsToLapStr(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(3);
  const padded = remainder.padStart(6, '0');
  return `${mins}:${padded}`;
}

export const QualifyingView: React.FC<Props> = ({
  entries,
  selectedDriver,
  onSelectDriver,
  fastestLap,
  circuitName,
  sessionName = 'QUALIFYING SESSION',
  className = ''
}) => {
  const [activePhase, setActivePhase] = useState<QualifyingPhase>('Q3');

  // Process and sort qualifying phase data
  const {
    rows,
    sessionBestLapTime,
    sessionBestDriver,
    fastestS1,
    fastestS2,
    fastestS3,
    theoreticalBestLapStr,
    theoreticalDeltaStr
  } = useMemo<{
    rows: QualifyingDriverRow[];
    sessionBestLapTime: string;
    sessionBestDriver: TimingEntry | null;
    fastestS1: { time: string; driver: string } | null;
    fastestS2: { time: string; driver: string } | null;
    fastestS3: { time: string; driver: string } | null;
    theoreticalBestLapStr: string;
    theoreticalDeltaStr: string;
  }>(() => {
    if (!entries || entries.length === 0) {
      return {
        rows: [],
        sessionBestLapTime: '—',
        sessionBestDriver: null,
        fastestS1: null,
        fastestS2: null,
        fastestS3: null,
        theoreticalBestLapStr: '—',
        theoreticalDeltaStr: '—'
      };
    }

    // 1. Identify baseline lap times and sector times for each driver
    const parsedEntries = entries.map((e, idx) => {
      const parsedBest = parseLapSeconds(e.bestLapTime) || (80 + idx * 0.18);
      // Realistic Q1, Q2, Q3 progressions:
      // Track evolves ~0.3-0.5s from Q1 to Q3, engine modes turned up
      const q1Secs = parsedBest + 0.42 + (idx * 0.04);
      const q2Secs = idx < 15 ? parsedBest + 0.18 + (idx * 0.02) : undefined;
      const q3Secs = idx < 10 ? parsedBest : undefined;

      return {
        entry: e,
        parsedBest,
        q1Secs,
        q2Secs,
        q3Secs
      };
    });

    // Find overall session best across all entries
    let minSessionSecs = Infinity;
    let bestDriver: TimingEntry | null = null;
    parsedEntries.forEach(item => {
      if (item.parsedBest < minSessionSecs) {
        minSessionSecs = item.parsedBest;
        bestDriver = item.entry;
      }
    });

    const sessionBestLapTime = minSessionSecs < Infinity ? secondsToLapStr(minSessionSecs) : '—';

    // 2. Filter & sort according to activePhase
    let activeEntries: typeof parsedEntries = [];
    if (activePhase === 'Q1') {
      // All 20 cars in Q1, sorted by Q1 time
      activeEntries = [...parsedEntries].sort((a, b) => a.q1Secs - b.q1Secs);
    } else if (activePhase === 'Q2') {
      // Top 15 from Q1 advance to Q2
      const q1Sorted = [...parsedEntries].sort((a, b) => a.q1Secs - b.q1Secs);
      const q2Qualifiers = q1Sorted.slice(0, 15).sort((a, b) => (a.q2Secs || 999) - (b.q2Secs || 999));
      // Append eliminated drivers (P16-P20) at the bottom
      const eliminated = q1Sorted.slice(15);
      activeEntries = [...q2Qualifiers, ...eliminated];
    } else if (activePhase === 'Q3') {
      // Top 10 from Q2 advance to Q3
      const q1Sorted = [...parsedEntries].sort((a, b) => a.q1Secs - b.q1Secs);
      const q2Sorted = q1Sorted.slice(0, 15).sort((a, b) => (a.q2Secs || 999) - (b.q2Secs || 999));
      const q3Qualifiers = q2Sorted.slice(0, 10).sort((a, b) => (a.q3Secs || 999) - (b.q3Secs || 999));
      const eliminatedQ2 = q2Sorted.slice(10, 15);
      const eliminatedQ1 = q1Sorted.slice(15);
      activeEntries = [...q3Qualifiers, ...eliminatedQ2, ...eliminatedQ1];
    } else {
      // ALL combined classification (final pole position order)
      const q1Sorted = [...parsedEntries].sort((a, b) => a.q1Secs - b.q1Secs);
      const q2Sorted = q1Sorted.slice(0, 15).sort((a, b) => (a.q2Secs || 999) - (b.q2Secs || 999));
      const q3Sorted = q2Sorted.slice(0, 10).sort((a, b) => (a.q3Secs || 999) - (b.q3Secs || 999));
      activeEntries = [...q3Sorted, ...q2Sorted.slice(10, 15), ...q1Sorted.slice(15)];
    }

    // 3. Calculate phase best lap time & fastest sectors across the active phase
    let phaseMinSecs = Infinity;
    let bestS1Secs = Infinity;
    let bestS2Secs = Infinity;
    let bestS3Secs = Infinity;
    let bestS1Driver = '';
    let bestS2Driver = '';
    let bestS3Driver = '';

    // First pass to find absolute fastest sectors in the session
    entries.forEach(e => {
      const s1 = parseFloat(e.sectors[0]?.timeStr || '0');
      const s2 = parseFloat(e.sectors[1]?.timeStr || '0');
      const s3 = parseFloat(e.sectors[2]?.timeStr || '0');
      if (s1 > 0 && s1 < bestS1Secs) { bestS1Secs = s1; bestS1Driver = e.driverCode; }
      if (s2 > 0 && s2 < bestS2Secs) { bestS2Secs = s2; bestS2Driver = e.driverCode; }
      if (s3 > 0 && s3 < bestS3Secs) { bestS3Secs = s3; bestS3Driver = e.driverCode; }
    });

    // Benchmark p1 lap time in current phase for gap calculations
    const p1Item = activeEntries[0];
    const p1Secs = activePhase === 'Q1'
      ? p1Item?.q1Secs
      : activePhase === 'Q2'
      ? p1Item?.q2Secs || p1Item?.q1Secs
      : p1Item?.q3Secs || p1Item?.parsedBest;

    const rows: QualifyingDriverRow[] = activeEntries.map((item, idx) => {
      const pos = idx + 1;
      let phaseTimeSecs = item.parsedBest;
      let isEliminated = false;
      let eliminationPhase: 'Q1' | 'Q2' | undefined = undefined;

      if (activePhase === 'Q1') {
        phaseTimeSecs = item.q1Secs;
        isEliminated = pos > 15;
        if (isEliminated) eliminationPhase = 'Q1';
      } else if (activePhase === 'Q2') {
        if (pos <= 15 && item.q2Secs != null) {
          phaseTimeSecs = item.q2Secs;
          isEliminated = pos > 10;
          if (isEliminated) eliminationPhase = 'Q2';
        } else {
          phaseTimeSecs = item.q1Secs;
          isEliminated = true;
          eliminationPhase = 'Q1';
        }
      } else if (activePhase === 'Q3') {
        if (pos <= 10 && item.q3Secs != null) {
          phaseTimeSecs = item.q3Secs;
        } else if (pos <= 15 && item.q2Secs != null) {
          phaseTimeSecs = item.q2Secs;
          isEliminated = true;
          eliminationPhase = 'Q2';
        } else {
          phaseTimeSecs = item.q1Secs;
          isEliminated = true;
          eliminationPhase = 'Q1';
        }
      } else {
        // ALL
        if (pos <= 10 && item.q3Secs != null) phaseTimeSecs = item.q3Secs;
        else if (pos <= 15 && item.q2Secs != null) { phaseTimeSecs = item.q2Secs; isEliminated = true; eliminationPhase = 'Q2'; }
        else { phaseTimeSecs = item.q1Secs; isEliminated = true; eliminationPhase = 'Q1'; }
      }

      if (phaseTimeSecs < phaseMinSecs) {
        phaseMinSecs = phaseTimeSecs;
      }

      const isOverallFastest = Math.abs(phaseTimeSecs - minSessionSecs) < 0.005;
      const isPhaseFastest = pos === 1;

      // Format gap to P1
      const deltaToP1 = Math.max(0, phaseTimeSecs - (p1Secs || phaseTimeSecs));
      const gapToP1 = pos === 1 ? 'POLE / P1' : `+${deltaToP1.toFixed(3)}`;

      // Format sectors: realistic variations matching the lap time
      const baseS1 = parseFloat(item.entry.sectors[0]?.timeStr || '0') || (bestS1Secs + 0.12);
      const baseS2 = parseFloat(item.entry.sectors[1]?.timeStr || '0') || (bestS2Secs + 0.15);
      const baseS3 = parseFloat(item.entry.sectors[2]?.timeStr || '0') || (bestS3Secs + 0.14);

      // Status tagging
      const s1Status: SectorTime['status'] = Math.abs(baseS1 - bestS1Secs) < 0.02 ? 'overall-best' : pos <= 6 ? 'personal-best' : 'normal';
      const s2Status: SectorTime['status'] = Math.abs(baseS2 - bestS2Secs) < 0.02 ? 'overall-best' : pos <= 6 ? 'personal-best' : 'normal';
      const s3Status: SectorTime['status'] = Math.abs(baseS3 - bestS3Secs) < 0.02 ? 'overall-best' : pos <= 6 ? 'personal-best' : 'normal';

      return {
        position: pos,
        entry: item.entry,
        q1Time: secondsToLapStr(item.q1Secs),
        q2Time: item.q2Secs ? secondsToLapStr(item.q2Secs) : '—',
        q3Time: item.q3Secs ? secondsToLapStr(item.q3Secs) : '—',
        bestLapTime: secondsToLapStr(phaseTimeSecs),
        bestLapSeconds: phaseTimeSecs,
        gapToP1,
        gapToP1Seconds: deltaToP1,
        sector1: { sector: 1, timeStr: baseS1.toFixed(3), seconds: baseS1, status: s1Status },
        sector2: { sector: 2, timeStr: baseS2.toFixed(3), seconds: baseS2, status: s2Status },
        sector3: { sector: 3, timeStr: baseS3.toFixed(3), seconds: baseS3, status: s3Status },
        isOverallFastest,
        isPhaseFastest,
        isEliminated,
        eliminationPhase,
        lapsInPhase: Math.max(3, Math.min(12, 12 - pos)),
        tyreCompound: (pos <= 8 ? 'SOFT' : pos <= 16 ? 'MEDIUM' : 'SOFT') as TyreCompound,
        tyreAge: (pos % 3) + 1
      };
    });

    // 4. Theoretical Best Lap calculation
    const theoreticalBestSecs = (bestS1Secs < Infinity ? bestS1Secs : 26.5) +
      (bestS2Secs < Infinity ? bestS2Secs : 27.0) +
      (bestS3Secs < Infinity ? bestS3Secs : 27.0);

    const theoreticalBestLapStr = secondsToLapStr(theoreticalBestSecs);
    const theoreticalDelta = minSessionSecs < Infinity ? (minSessionSecs - theoreticalBestSecs) : 0;
    const theoreticalDeltaStr = theoreticalDelta > 0 ? `-${theoreticalDelta.toFixed(3)}s` : '0.000s';

    return {
      rows,
      sessionBestLapTime,
      sessionBestDriver: bestDriver,
      fastestS1: bestS1Secs < Infinity ? { time: bestS1Secs.toFixed(3), driver: bestS1Driver } : null,
      fastestS2: bestS2Secs < Infinity ? { time: bestS2Secs.toFixed(3), driver: bestS2Driver } : null,
      fastestS3: bestS3Secs < Infinity ? { time: bestS3Secs.toFixed(3), driver: bestS3Driver } : null,
      theoreticalBestLapStr,
      theoreticalDeltaStr
    };
  }, [entries, activePhase]);

  // Sector color styling helper
  const getSectorStyle = (status: SectorTime['status']) => {
    if (status === 'overall-best') {
      return 'text-fuchsia-400 bg-fuchsia-950/40 border border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)] font-bold';
    }
    if (status === 'personal-best') {
      return 'text-emerald-400 bg-emerald-950/30 font-semibold';
    }
    return 'text-neutral-300';
  };

  return (
    <div className={`f1-qualifying-view flex flex-col gap-3 font-mono text-xs ${className}`}>
      {/* 1. Header Bar: Session Switcher (Q1, Q2, Q3, ALL) + Status & Holographic Highlight */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#0d1016] border border-[#242c3b] rounded-xl shadow-lg">
        {/* Left: Session Title and Provisional Pole Callout */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-7 rounded-sm bg-gradient-to-b from-[#00f0ff] via-[#8b5cf6] to-[#ec4899] shadow-[0_0_12px_rgba(0,240,255,0.5)] flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white tracking-wider uppercase">
                QUALIFYING TIMING
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-500/40 font-bold flex items-center gap-1">
                <Trophy className="w-3 h-3 text-fuchsia-400" />
                POLE SHOOTOUT
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
              <span>{circuitName || 'FORMULA 1 CIRCUIT'}</span>
              <span>·</span>
              <span className="text-white font-semibold">
                PROVISIONAL POLE: <strong className="text-fuchsia-400 font-black">{sessionBestDriver?.driverCode || '—'}</strong> ({sessionBestLapTime})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Interactive 'Q1', 'Q2', 'Q3', 'ALL' Session Switcher */}
        <div className="flex items-center bg-[#131720] p-1 rounded-xl border border-[#263042] self-start sm:self-auto">
          {(['Q1', 'Q2', 'Q3', 'ALL'] as QualifyingPhase[]).map((phase) => {
            const isActive = activePhase === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => setActivePhase(phase)}
                aria-pressed={isActive}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-[#00f0ff]/20 to-[#8b5cf6]/20 border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1a202d] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{phase}</span>
                  {phase === 'Q3' && <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Theoretical Best Lap & Fastest Sectors Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        {/* Fastest S1 */}
        <div className="bg-[#10141c] border border-[#212836] p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-neutral-400 uppercase font-semibold">BEST SECTOR 1</div>
            <div className="text-sm font-bold text-fuchsia-400 timing-cell mt-0.5">
              {fastestS1 ? `${fastestS1.time}s` : '—'}
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18202d] text-neutral-300 font-bold">
            {fastestS1?.driver || '—'}
          </span>
        </div>

        {/* Fastest S2 */}
        <div className="bg-[#10141c] border border-[#212836] p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-neutral-400 uppercase font-semibold">BEST SECTOR 2</div>
            <div className="text-sm font-bold text-fuchsia-400 timing-cell mt-0.5">
              {fastestS2 ? `${fastestS2.time}s` : '—'}
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18202d] text-neutral-300 font-bold">
            {fastestS2?.driver || '—'}
          </span>
        </div>

        {/* Fastest S3 */}
        <div className="bg-[#10141c] border border-[#212836] p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-neutral-400 uppercase font-semibold">BEST SECTOR 3</div>
            <div className="text-sm font-bold text-fuchsia-400 timing-cell mt-0.5">
              {fastestS3 ? `${fastestS3.time}s` : '—'}
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18202d] text-neutral-300 font-bold">
            {fastestS3?.driver || '—'}
          </span>
        </div>

        {/* Theoretical Best Lap */}
        <div className="bg-[#10141c] border border-[#212836] p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-neutral-400 uppercase font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#00f0ff]" />
              THEORETICAL BEST
            </div>
            <div className="text-sm font-bold text-white timing-cell mt-0.5">
              {theoreticalBestLapStr}
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#00f0ff] timing-cell">
            {theoreticalDeltaStr}
          </span>
        </div>
      </div>

      {/* 3. Main Qualifying Classification Table with Sector 1, 2, 3 and Best Lap Time Highlighted */}
      <div className="border border-[#232b38] bg-[#0e1117] rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Formula 1 Qualifying Results">
            <thead>
              <tr className="bg-[#0b0e14] border-b border-[#212836] text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">POS</th>
                <th className="py-2.5 px-3 min-w-[150px]">DRIVER</th>
                {activePhase === 'ALL' ? (
                  <>
                    <th className="py-2.5 px-3 text-right">Q1</th>
                    <th className="py-2.5 px-3 text-right">Q2</th>
                    <th className="py-2.5 px-3 text-right">Q3</th>
                  </>
                ) : null}
                <th className="py-2.5 px-3 text-right min-w-[90px]">SECTOR 1</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">SECTOR 2</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">SECTOR 3</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">BEST LAP</th>
                <th className="py-2.5 px-3 text-right min-w-[80px]">GAP / P1</th>
                <th className="py-2.5 px-3 text-center w-16">LAPS</th>
                <th className="py-2.5 px-3 text-center w-20">TYRE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c222e]">
              {rows.map((row, idx) => {
                const isSelected = selectedDriver?.driverNumber === row.entry.driverNumber;

                // Determine if this row sits immediately before the elimination cutoff line
                const showQ1Cutoff = activePhase === 'Q1' && row.position === 15;
                const showQ2Cutoff = activePhase === 'Q2' && row.position === 10;
                const showAllQ3Cutoff = activePhase === 'ALL' && row.position === 10;
                const showAllQ2Cutoff = activePhase === 'ALL' && row.position === 15;

                return (
                  <React.Fragment key={row.entry.driverNumber}>
                    <tr
                      onClick={() => onSelectDriver(row.entry)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectDriver(row.entry);
                        }
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#00f0ff]/15 via-[#8b5cf6]/10 to-transparent shadow-[inset_3px_0_0_#00f0ff]'
                          : row.isOverallFastest
                          ? 'bg-fuchsia-950/25 hover:bg-fuchsia-950/40 shadow-[inset_3px_0_0_#d946ef]'
                          : row.isEliminated
                          ? 'bg-red-950/10 hover:bg-red-950/20 opacity-80'
                          : 'hover:bg-[#151b24]'
                      }`}
                    >
                      {/* POS */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={`inline-block w-6 text-center ${
                            row.position === 1
                              ? 'text-fuchsia-400 font-black'
                              : row.isEliminated
                              ? 'text-red-400'
                              : 'text-white'
                          }`}
                        >
                          {String(row.position).padStart(2, '0')}
                        </span>
                      </td>

                      {/* DRIVER */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-6 rounded-full flex-shrink-0"
                            style={{ backgroundColor: row.entry.teamColor }}
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wide">
                                {row.entry.driverCode}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                #{row.entry.driverNumber}
                              </span>
                              {row.position === 1 && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-300 font-black uppercase">
                                  POLE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">
                              {row.entry.driverName} · {row.entry.teamName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Q1, Q2, Q3 columns (when in ALL phase view) */}
                      {activePhase === 'ALL' && (
                        <>
                          <td className="py-2.5 px-3 text-right timing-cell text-neutral-300">
                            {row.q1Time}
                          </td>
                          <td className="py-2.5 px-3 text-right timing-cell text-neutral-300">
                            {row.q2Time}
                          </td>
                          <td className="py-2.5 px-3 text-right timing-cell text-neutral-300">
                            {row.q3Time}
                          </td>
                        </>
                      )}

                      {/* SECTOR 1 */}
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded timing-cell ${getSectorStyle(row.sector1.status)}`}>
                          {row.sector1.timeStr}
                        </span>
                      </td>

                      {/* SECTOR 2 */}
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded timing-cell ${getSectorStyle(row.sector2.status)}`}>
                          {row.sector2.timeStr}
                        </span>
                      </td>

                      {/* SECTOR 3 */}
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded timing-cell ${getSectorStyle(row.sector3.status)}`}>
                          {row.sector3.timeStr}
                        </span>
                      </td>

                      {/* BEST LAP TIME (HIGHLIGHTED FOR THE SESSION) */}
                      <td className="py-2.5 px-3 text-right font-bold">
                        {row.isOverallFastest ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/60 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.4)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                            <span className="text-sm font-black timing-cell tracking-tight">
                              {row.bestLapTime}
                            </span>
                          </div>
                        ) : row.isPhaseFastest ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="text-xs font-bold timing-cell">
                              {row.bestLapTime}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs timing-cell text-white">
                            {row.bestLapTime}
                          </span>
                        )}
                      </td>

                      {/* GAP / DELTA */}
                      <td className="py-2.5 px-3 text-right timing-cell text-[11px] font-semibold">
                        <span
                          className={
                            row.position === 1
                              ? 'text-fuchsia-400 font-bold'
                              : 'text-neutral-400'
                          }
                        >
                          {row.gapToP1}
                        </span>
                      </td>

                      {/* LAPS */}
                      <td className="py-2.5 px-3 text-center timing-cell text-neutral-400">
                        {row.lapsInPhase}
                      </td>

                      {/* TYRE */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[10px] font-black border ${
                            row.tyreCompound === 'SOFT'
                              ? 'text-red-400 border-red-500 bg-red-950/40'
                              : row.tyreCompound === 'MEDIUM'
                              ? 'text-yellow-400 border-yellow-500 bg-yellow-950/40'
                              : 'text-neutral-200 border-neutral-400 bg-neutral-900'
                          }`}
                        >
                          {row.tyreCompound[0]} {row.tyreAge}L
                        </span>
                      </td>
                    </tr>

                    {/* CUTOFF BARS */}
                    {showQ1Cutoff && (
                      <tr className="bg-red-950/30 border-y-2 border-red-500/50">
                        <td colSpan={10} className="py-1 px-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 tracking-wider">
                            <span>▼ ELIMINATION CUTOFF LINE · P16-P20 ELIMINATED IN Q1 ▼</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {showQ2Cutoff && (
                      <tr className="bg-red-950/30 border-y-2 border-red-500/50">
                        <td colSpan={10} className="py-1 px-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 tracking-wider">
                            <span>▼ TOP 10 SHOOTOUT CUTOFF LINE · P11-P15 ELIMINATED IN Q2 ▼</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {showAllQ3Cutoff && (
                      <tr className="bg-fuchsia-950/30 border-y border-fuchsia-500/40">
                        <td colSpan={12} className="py-1 px-3 text-center">
                          <div className="text-[10px] font-bold text-fuchsia-300 tracking-wider">
                            ▲ TOP 10 QUALIFIED FOR Q3 SHOOTOUT ▲
                          </div>
                        </td>
                      </tr>
                    )}

                    {showAllQ2Cutoff && (
                      <tr className="bg-amber-950/30 border-y border-amber-500/40">
                        <td colSpan={12} className="py-1 px-3 text-center">
                          <div className="text-[10px] font-bold text-amber-300 tracking-wider">
                            ▲ TOP 15 ADVANCED FROM Q1 ▲
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
