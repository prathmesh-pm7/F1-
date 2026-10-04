import React, { useState, useMemo, useEffect } from 'react';
import {
  LiveSessionSnapshot,
  TimingEntry,
  Team,
  DriverStanding,
  LapTelemetry,
  TyreCompound
} from '../../types/f1';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Trophy,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Clock,
  Flame,
  Star,
  Shield,
  Layers
} from 'lucide-react';

const FAVORITE_DRIVER_STORAGE_KEY = 'f1-pulse.favorite-driver-number';

export interface PerformanceInsightsProps {
  snapshot: LiveSessionSnapshot;
  driverStandings?: DriverStanding[];
  favoriteTeam?: Team | null;
  favoriteDriverNumber?: number | null;
  onSelectFavoriteDriver?: (driverNumber: number) => void;
  completedLaps?: LapTelemetry[];
  onSelectDriver?: (entry: TimingEntry) => void;
}

// Points system for F1 race finishes (P1 to P10)
const F1_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

/**
 * Parses lap time strings like "1:21.432" or pure seconds like "81.432" into numerical seconds.
 */
function parseLapSeconds(lapTimeStr?: string, duration?: number): number | null {
  if (duration != null && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
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
  } else {
    const val = parseFloat(clean);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return null;
}

/**
 * Formats numerical seconds into F1 standard format (e.g., 1:21.432)
 */
function formatLapTime(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const remSecs = (seconds % 60).toFixed(3);
  return `${mins}:${remSecs.padStart(6, '0')}`;
}

/**
 * Formats a second delta (+0.240s or -0.150s)
 */
function formatDelta(deltaSecs: number | null, invertColor = false): { text: string; isFaster: boolean } {
  if (deltaSecs == null || !Number.isFinite(deltaSecs)) {
    return { text: '—', isFaster: false };
  }
  const isFaster = deltaSecs < 0; // In lap times, lower/negative means faster
  const sign = deltaSecs > 0 ? '+' : '';
  const text = `${sign}${deltaSecs.toFixed(3)}s`;
  return { text, isFaster: invertColor ? !isFaster : isFaster };
}

export const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({
  snapshot,
  driverStandings = [],
  favoriteTeam,
  favoriteDriverNumber: externalFavNum,
  onSelectFavoriteDriver,
  completedLaps = [],
  onSelectDriver
}) => {
  // Local state for favorite driver
  const [internalFavNum, setInternalFavNum] = useState<number | null>(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITE_DRIVER_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'telemetry' | 'sectors'>('summary');

  // Sync internal and external favorite driver selection
  const activeFavNum = externalFavNum ?? internalFavNum;

  const handleSetFavoriteDriver = (driverNumber: number) => {
    setInternalFavNum(driverNumber);
    try {
      window.localStorage.setItem(FAVORITE_DRIVER_STORAGE_KEY, String(driverNumber));
    } catch {
      /* optional storage */
    }
    if (onSelectFavoriteDriver) {
      onSelectFavoriteDriver(driverNumber);
    }
  };

  // Resolve the favorite driver timing entry
  const favoriteEntry = useMemo<TimingEntry | null>(() => {
    if (!snapshot.entries || snapshot.entries.length === 0) return null;

    // 1. Explicitly chosen driver number
    if (activeFavNum != null) {
      const match = snapshot.entries.find(e => e.driverNumber === activeFavNum);
      if (match) return match;
    }

    // 2. Favorite team's lead driver
    if (favoriteTeam) {
      const teamDrivers = snapshot.entries.filter(
        e => e.teamName === favoriteTeam.name || e.teamName === favoriteTeam.fullName
      );
      if (teamDrivers.length > 0) {
        return teamDrivers.sort((a, b) => a.position - b.position)[0];
      }
    }

    // 3. Leader of the championship standings if in race
    if (driverStandings.length > 0) {
      const leaderStanding = driverStandings[0];
      const match = snapshot.entries.find(e => e.driverNumber === leaderStanding.driver.number);
      if (match) return match;
    }

    // 4. Default to current session leader
    return snapshot.entries[0] || null;
  }, [snapshot.entries, activeFavNum, favoriteTeam, driverStandings]);

  // Current race leader (P1)
  const leaderEntry = useMemo<TimingEntry | null>(() => {
    if (!snapshot.entries || snapshot.entries.length === 0) return null;
    return snapshot.entries[0];
  }, [snapshot.entries]);

  // Find championship standing for the favorite driver
  const favoriteStanding = useMemo<DriverStanding | null>(() => {
    if (!favoriteEntry || driverStandings.length === 0) return null;
    return (
      driverStandings.find(
        s =>
          s.driver.number === favoriteEntry.driverNumber ||
          s.driver.code === favoriteEntry.driverCode
      ) ?? null
    );
  }, [favoriteEntry, driverStandings]);

  // Find closest championship rival
  const rivalDriverInfo = useMemo<{
    standing: DriverStanding | null;
    entry: TimingEntry | null;
    pointsDelta: number;
    titleContext: string;
  }>(() => {
    if (!favoriteEntry) return { standing: null, entry: null, pointsDelta: 0, titleContext: '' };

    if (favoriteStanding && driverStandings.length > 1) {
      // Find closest driver in standings points
      const favPos = favoriteStanding.position;
      let targetStanding: DriverStanding | null = null;

      if (favPos === 1) {
        // If leading, main rival is P2
        targetStanding = driverStandings[1] || null;
      } else {
        // If trailing, target is the driver right ahead in the championship (P - 1)
        targetStanding = driverStandings.find(s => s.position === favPos - 1) || driverStandings[0];
      }

      if (targetStanding) {
        const entry = snapshot.entries.find(
          e =>
            e.driverNumber === targetStanding?.driver.number ||
            e.driverCode === targetStanding?.driver.code
        );
        const ptsDelta = Math.abs(favoriteStanding.points - targetStanding.points);
        const titleContext =
          favPos === 1
            ? `Championship Chaser (${targetStanding.driver.code} - P2)`
            : `Championship Target (${targetStanding.driver.code} - P${targetStanding.position})`;

        return {
          standing: targetStanding,
          entry: entry || null,
          pointsDelta: ptsDelta,
          titleContext
        };
      }
    }

    // Fallback if no standings: compare against car 1 position ahead or P2
    const favPos = favoriteEntry.position;
    const rivalPos = favPos === 1 ? 2 : favPos - 1;
    const fallbackEntry = snapshot.entries.find(e => e.position === rivalPos) || null;
    return {
      standing: null,
      entry: fallbackEntry,
      pointsDelta: 0,
      titleContext: favPos === 1 ? 'Primary Chaser (P2)' : 'Car Ahead (P' + rivalPos + ')'
    };
  }, [favoriteEntry, favoriteStanding, driverStandings, snapshot.entries]);

  // Performance calculations: Pace, sectors, tyres, and telemetry deltas
  const analytics = useMemo(() => {
    if (!favoriteEntry || !snapshot.entries || snapshot.entries.length === 0) {
      return null;
    }

    const currentLap = snapshot.currentLap || favoriteEntry.currentLap || 1;

    // 1. Gather lap times per driver from completedLaps or fallback to snapshot data
    const driverLapsMap = new Map<number, number[]>();

    if (completedLaps.length > 0) {
      completedLaps
        .filter(l => l.lapNumber <= currentLap && l.lapNumber > 0)
        .forEach(lap => {
          const secs = parseLapSeconds(lap.lapTime, lap.lapDuration);
          if (secs != null && secs > 0) {
            const list = driverLapsMap.get(lap.driverNumber) || [];
            list.push(secs);
            driverLapsMap.set(lap.driverNumber, list);
          }
        });
    }

    // Function to calculate representative pace for a driver
    const getDriverPace = (entry: TimingEntry): { pace: number | null; lapsCount: number; paceSource: string } => {
      const historical = driverLapsMap.get(entry.driverNumber);
      if (historical && historical.length > 0) {
        // Take last 3 to 5 clean laps
        const recent = historical.slice(-5);
        if (recent.length >= 2) {
          // Filter outliers (e.g. pit stops or yellow flags > 115% of minimum)
          const minTime = Math.min(...recent);
          const clean = recent.filter(t => t <= minTime * 1.15);
          if (clean.length > 0) {
            const avg = clean.reduce((sum, v) => sum + v, 0) / clean.length;
            return { pace: avg, lapsCount: clean.length, paceSource: `Avg of last ${clean.length} clean laps` };
          }
        }
      }

      // Fallback: parse lastLapTime
      const lastSec = parseLapSeconds(entry.lastLapTime);
      if (lastSec != null && lastSec > 0) {
        return { pace: lastSec, lapsCount: 1, paceSource: 'Last completed lap' };
      }

      // Fallback: parse bestLapTime
      const bestSec = parseLapSeconds(entry.bestLapTime);
      if (bestSec != null && bestSec > 0) {
        return { pace: bestSec, lapsCount: 1, paceSource: 'Best lap time' };
      }

      return { pace: null, lapsCount: 0, paceSource: 'Insufficient telemetry' };
    };

    // Calculate pace for every active entry
    const activeEntries = snapshot.entries.filter(e => !e.retired && !e.stopped);
    const paceRecords = activeEntries
      .map(entry => ({
        entry,
        paceInfo: getDriverPace(entry)
      }))
      .filter((r): r is { entry: TimingEntry; paceInfo: { pace: number; lapsCount: number; paceSource: string } } =>
        r.paceInfo.pace != null && r.paceInfo.pace > 0
      );

    // Sort by fastest pace
    paceRecords.sort((a, b) => a.paceInfo.pace - b.paceInfo.pace);

    // Favorite driver pace
    const favPaceRecord = paceRecords.find(r => r.entry.driverNumber === favoriteEntry.driverNumber);
    const favoritePace = favPaceRecord?.paceInfo.pace ?? parseLapSeconds(favoriteEntry.lastLapTime) ?? parseLapSeconds(favoriteEntry.bestLapTime);

    // Leader pace
    const leaderPaceRecord = paceRecords.find(r => r.entry.position === 1);
    const leaderPace = leaderPaceRecord?.paceInfo.pace ?? null;

    // Rival pace
    const rivalEntry = rivalDriverInfo.entry;
    const rivalPaceRecord = rivalEntry ? paceRecords.find(r => r.entry.driverNumber === rivalEntry.driverNumber) : null;
    const rivalPace = rivalPaceRecord?.paceInfo.pace ?? null;

    // Field statistics
    const allPaces = paceRecords.map(r => r.paceInfo.pace);
    let fieldMedianPace: number | null = null;
    let fieldAveragePace: number | null = null;

    if (allPaces.length > 0) {
      allPaces.sort((a, b) => a - b);
      const mid = Math.floor(allPaces.length / 2);
      fieldMedianPace = allPaces.length % 2 !== 0 ? allPaces[mid] : (allPaces[mid - 1] + allPaces[mid]) / 2;
      fieldAveragePace = allPaces.reduce((a, b) => a + b, 0) / allPaces.length;
    }

    // Favorite ranking in pace
    const favoritePaceRank = favoritePace != null
      ? paceRecords.findIndex(r => r.entry.driverNumber === favoriteEntry.driverNumber) + 1
      : null;

    // Delta vs Field Median
    const deltaVsFieldMedian = favoritePace != null && fieldMedianPace != null
      ? favoritePace - fieldMedianPace
      : null;

    // Delta vs Leader
    const deltaVsLeader = favoritePace != null && leaderPace != null
      ? favoritePace - leaderPace
      : null;

    // Delta vs Rival
    const deltaVsRival = favoritePace != null && rivalPace != null
      ? favoritePace - rivalPace
      : null;

    // Sector Analysis
    // S1, S2, S3 deltas vs the best sector in the session
    const getSectorSecs = (entry: TimingEntry, sIdx: number): number | null => {
      const s = entry.sectors?.[sIdx];
      if (!s) return null;
      if (s.seconds != null && s.seconds > 0) return s.seconds;
      return parseLapSeconds(s.timeStr);
    };

    const sectorBests = [0, 1, 2].map(sIdx => {
      const times = snapshot.entries
        .map(e => getSectorSecs(e, sIdx))
        .filter((t): t is number => t != null && t > 0);
      return times.length > 0 ? Math.min(...times) : null;
    });

    const favSectors = [0, 1, 2].map(sIdx => {
      const secTime = getSectorSecs(favoriteEntry, sIdx);
      const best = sectorBests[sIdx];
      const delta = secTime != null && best != null ? secTime - best : null;
      const status = favoriteEntry.sectors?.[sIdx]?.status ?? 'normal';
      return {
        sector: sIdx + 1,
        time: secTime,
        timeStr: favoriteEntry.sectors?.[sIdx]?.timeStr || (secTime ? secTime.toFixed(3) : '—'),
        delta,
        bestTime: best,
        status
      };
    });

    // Determine strongest sector (lowest delta to best)
    let bestSector = favSectors[0];
    let weakestSector = favSectors[0];
    favSectors.forEach(s => {
      if (s.delta != null) {
        if (bestSector.delta == null || s.delta < bestSector.delta) bestSector = s;
        if (weakestSector.delta == null || s.delta > weakestSector.delta) weakestSector = s;
      }
    });

    // Tyre degradation estimate:
    // If telemetry laps exist for the current stint, calculate trend
    let estimatedDegPerLap: number | null = null;
    const favLaps = driverLapsMap.get(favoriteEntry.driverNumber);
    if (favLaps && favLaps.length >= 4) {
      const recent4 = favLaps.slice(-4);
      // Slope: (last - first) / laps
      const slope = (recent4[recent4.length - 1] - recent4[0]) / (recent4.length - 1);
      if (Number.isFinite(slope) && slope > -0.5 && slope < 0.5) {
        estimatedDegPerLap = Math.max(0.01, slope);
      }
    }
    if (estimatedDegPerLap == null) {
      // Rule-of-thumb baseline based on compound & tyre age
      const compound = favoriteEntry.tyre.compound;
      const base = compound === 'SOFT' ? 0.065 : compound === 'MEDIUM' ? 0.042 : 0.028;
      estimatedDegPerLap = base + (favoriteEntry.tyre.age > 15 ? 0.02 : 0);
    }

    // Virtual championship live points calculation
    const currentPos = favoriteEntry.position;
    const virtualPoints = currentPos >= 1 && currentPos <= 10 ? F1_POINTS_SYSTEM[currentPos - 1] : 0;

    let rivalVirtualPoints = 0;
    if (rivalEntry) {
      const rPos = rivalEntry.position;
      rivalVirtualPoints = rPos >= 1 && rPos <= 10 ? F1_POINTS_SYSTEM[rPos - 1] : 0;
    }
    const virtualPointsSwing = virtualPoints - rivalVirtualPoints;

    return {
      currentLap,
      favoritePace,
      favPaceRecord,
      paceRecords,
      leaderPace,
      rivalPace,
      fieldMedianPace,
      fieldAveragePace,
      favoritePaceRank,
      totalPaceDrivers: paceRecords.length,
      deltaVsFieldMedian,
      deltaVsLeader,
      deltaVsRival,
      favSectors,
      bestSector,
      weakestSector,
      estimatedDegPerLap,
      virtualPoints,
      rivalVirtualPoints,
      virtualPointsSwing
    };
  }, [favoriteEntry, snapshot, completedLaps, rivalDriverInfo]);

  // Construct the concise, data-driven narrative summary
  const summaryNarrative = useMemo(() => {
    if (!favoriteEntry || !analytics) {
      return 'Telemetry data is synchronizing. Pace analysis will appear once completed laps are registered.';
    }

    const {
      favoritePace,
      favoritePaceRank,
      totalPaceDrivers,
      deltaVsFieldMedian,
      deltaVsRival,
      deltaVsLeader,
      bestSector,
      weakestSector,
      estimatedDegPerLap,
      currentLap,
      virtualPoints,
      virtualPointsSwing
    } = analytics;

    const code = favoriteEntry.driverCode;
    const name = favoriteEntry.driverName;
    const pos = favoriteEntry.position;
    const formattedPace = formatLapTime(favoritePace);
    const tyre = favoriteEntry.tyre;
    const rivalCode = rivalDriverInfo.entry?.driverCode || rivalDriverInfo.standing?.driver.code || 'the nearest rival';

    // Pace relationship sentence
    let paceSentence = '';
    if (deltaVsFieldMedian != null) {
      const isFaster = deltaVsFieldMedian < 0;
      const absDelta = Math.abs(deltaVsFieldMedian).toFixed(3);
      if (isFaster) {
        paceSentence = `${code} holds a decisive +${absDelta}s/lap advantage over the field median (Pace Rank: #${favoritePaceRank || pos} of ${totalPaceDrivers})`;
      } else {
        paceSentence = `${code} trails the field median pace by ${absDelta}s/lap (Pace Rank: #${favoritePaceRank || pos} of ${totalPaceDrivers})`;
      }
    } else {
      paceSentence = `${code} is recording a representative lap pace of ${formattedPace}`;
    }

    // Rival matchup sentence
    let rivalSentence = '';
    if (deltaVsRival != null && rivalDriverInfo.entry) {
      const isFasterThanRival = deltaVsRival < 0;
      const absRivalDelta = Math.abs(deltaVsRival).toFixed(3);
      if (isFasterThanRival) {
        rivalSentence = `out-pacing direct rival ${rivalCode} (P${rivalDriverInfo.entry.position}) by +${absRivalDelta}s per lap`;
      } else {
        rivalSentence = `conceding ${absRivalDelta}s per lap to title contender ${rivalCode} (P${rivalDriverInfo.entry.position})`;
      }
    } else if (pos > 1 && deltaVsLeader != null) {
      const absLeaderDelta = Math.abs(deltaVsLeader).toFixed(3);
      const isFasterThanLeader = deltaVsLeader < 0;
      rivalSentence = isFasterThanLeader
        ? `closing the gap to race leader ${leaderEntry?.driverCode ?? 'P1'} by ${absLeaderDelta}s/lap`
        : `running ${absLeaderDelta}s/lap behind leader ${leaderEntry?.driverCode ?? 'P1'}`;
    } else if (pos === 1) {
      rivalSentence = 'controlling the race from the front with optimal tyre management';
    }

    // Sector insight
    let sectorSentence = '';
    if (bestSector && bestSector.delta != null) {
      if (bestSector.delta <= 0.05) {
        sectorSentence = `Primary strength is concentrated in Sector ${bestSector.sector} (personal best of ${bestSector.timeStr}), matching front-running sector pace.`;
      } else {
        sectorSentence = `Sector ${bestSector.sector} remains the strongest split (${bestSector.timeStr}), while Sector ${weakestSector.sector} (+${weakestSector.delta?.toFixed(3)}s) presents the main opportunity for lap time improvement.`;
      }
    }

    // Stint & Tyre Sentence
    const degStr = estimatedDegPerLap ? `~${estimatedDegPerLap.toFixed(3)}s/lap` : 'moderate';
    const stintSentence = `On ${tyre.compound} tyres with ${tyre.age} laps of wear, thermal degradation is trending at ${degStr}.`;

    // Championship sentence
    let championshipSentence = '';
    if (favoriteStanding) {
      if (virtualPoints > 0) {
        const swingStr = virtualPointsSwing > 0 ? `+${virtualPointsSwing} net swing` : `${virtualPointsSwing} net delta`;
        championshipSentence = `Running P${pos} projects to bank ${virtualPoints} championship points (${swingStr} relative to ${rivalCode}).`;
      } else {
        championshipSentence = `Currently outside the points positions in P${pos}; closing the deficit to P10 is critical for title retention.`;
      }
    }

    return `${name} (${code}) is circulating in P${pos} on Lap ${currentLap}. ${paceSentence}, ${rivalSentence}. ${sectorSentence} ${stintSentence} ${championshipSentence}`.trim();
  }, [favoriteEntry, analytics, leaderEntry, rivalDriverInfo, favoriteStanding]);

  // Copy narrative to clipboard
  const handleCopySummary = () => {
    if (!summaryNarrative) return;
    void navigator.clipboard.writeText(summaryNarrative);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!snapshot.entries || snapshot.entries.length === 0) {
    return (
      <section className="border border-[#242c37] bg-[#111418] p-4 text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-2 text-neutral-300">
          <Clock className="w-4 h-4 text-neutral-500 animate-spin" />
          <span>Awaiting timing snapshot to initialize Performance Insights...</span>
        </div>
      </section>
    );
  }

  if (!favoriteEntry || !analytics) {
    return (
      <section className="border border-[#242c37] bg-[#111418] p-4 text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-2 text-neutral-300">
          <Gauge className="w-4 h-4 text-neutral-500" />
          <span>Select a driver to view data-driven race pace telemetry.</span>
        </div>
      </section>
    );
  }

  const {
    favoritePace,
    deltaVsFieldMedian,
    deltaVsLeader,
    deltaVsRival,
    favoritePaceRank,
    totalPaceDrivers,
    favSectors,
    estimatedDegPerLap,
    virtualPoints,
    virtualPointsSwing,
    paceRecords,
    fieldMedianPace
  } = analytics;

  return (
    <section
      className="border border-[#222933] text-neutral-300 mb-4 transition-all rounded overflow-hidden"
      aria-label="Performance Insights Panel"
      style={{
        borderLeft: `4px solid ${favoriteEntry.teamColor || 'var(--f1-red)'}`,
        background: `linear-gradient(180deg, ${favoriteEntry.teamColor ? `${favoriteEntry.teamColor}12` : 'rgba(255,255,255,0.02)'} 0%, rgba(17, 20, 24, 0.95) 140px, #111418 100%)`,
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
      }}
    >
      {/* Component Header Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] px-4 py-3"
        style={{
          background: `linear-gradient(90deg, ${favoriteEntry.teamColor ? `${favoriteEntry.teamColor}18` : 'rgba(255,255,255,0.03)'} 0%, #161a20 40%, #161a20 100%)`
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 inline-block"
            style={{ backgroundColor: favoriteEntry.teamColor }}
          />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-neutral-400" />
            <span>PERFORMANCE INSIGHTS</span>
            <span className="text-neutral-500 font-normal">·</span>
            <span className="text-neutral-400 font-normal">RACE PACE & TELEMETRY</span>
          </h2>
        </div>

        {/* Favorite Driver Quick Selector & Actions */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="f1-fav-driver-select" className="text-neutral-400 text-[11px] uppercase">
            COMPARING:
          </label>
          <div className="relative">
            <select
              id="f1-fav-driver-select"
              value={favoriteEntry.driverNumber}
              onChange={e => handleSetFavoriteDriver(parseInt(e.target.value, 10))}
              className="bg-[#0e1115] border border-[#2d3748] text-white px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-neutral-400"
              aria-label="Select driver for race pace comparison"
            >
              {snapshot.entries.map(entry => (
                <option key={entry.driverNumber} value={entry.driverNumber}>
                  P{entry.position} #{entry.driverNumber} {entry.driverCode} ({entry.teamName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleSetFavoriteDriver(favoriteEntry.driverNumber)}
            title="Mark as followed favorite driver"
            className="p-1 border border-[#2d3748] bg-[#0e1115] hover:bg-[#1a202c] text-neutral-300 hover:text-yellow-400 transition-colors"
            aria-label="Save as primary favorite driver"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                activeFavNum === favoriteEntry.driverNumber
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-neutral-400'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1 px-2 py-1 border border-[#2d3748] bg-[#0e1115] hover:bg-[#1a202c] text-neutral-300 hover:text-white transition-colors"
            title="Copy executive telemetry brief to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-neutral-400" />
                <span className="text-[11px]">COPY BRIEF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 border border-[#2d3748] bg-[#0e1115] hover:bg-[#1a202c] text-neutral-400 hover:text-white"
            aria-label={isExpanded ? 'Collapse insights panel' : 'Expand insights panel'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Insights Content (Collapsible) */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Driver Focus Strip: Anti-slop zero-pill clean typographic layout */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#202732] text-xs">
            <div className="flex items-center gap-3">
              <span
                className="w-1.5 h-8 inline-block self-stretch"
                style={{ backgroundColor: favoriteEntry.teamColor }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white">{favoriteEntry.driverName}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-[#1a2029] border border-[#2c3644] font-bold text-neutral-200">
                    #{favoriteEntry.driverNumber}
                  </span>
                  <span className="text-xs font-semibold text-neutral-400">{favoriteEntry.driverCode}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {favoriteEntry.teamName} · Running P{favoriteEntry.position} · Lap {favoriteEntry.currentLap} · Tyre: {favoriteEntry.tyre.compound} ({favoriteEntry.tyre.age}L)
                </div>
              </div>
            </div>

            {/* High-level status indicators */}
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-neutral-500 uppercase block text-[10px]">CHAMPIONSHIP</span>
                <span className="font-bold text-white">
                  {favoriteStanding ? `P${favoriteStanding.position} (${favoriteStanding.points} pts)` : '—'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 uppercase block text-[10px]">REPRESENTATIVE PACE</span>
                <span className="font-bold text-white timing-cell">{formatLapTime(favoritePace)}</span>
              </div>
              <div>
                <span className="text-neutral-500 uppercase block text-[10px]">PACE RANK</span>
                <span className="font-bold text-neutral-200">
                  #{favoritePaceRank || '—'} / {totalPaceDrivers}
                </span>
              </div>
            </div>
          </div>

          {/* Data-Driven Briefing Box: Crisp, authoritative race engineering bulletin */}
          <div className="bg-[#0d1014] border border-[#222a36] p-3.5 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-red-600 inline-block" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  RACE PACE BRIEFING · AUTOMATED TELEMETRY SUMMARY
                </span>
              </div>
              <span className="text-[10px] text-neutral-500">
                LAP {snapshot.currentLap || favoriteEntry.currentLap} / {snapshot.totalLaps || '—'}
              </span>
            </div>

            <p className="text-xs text-neutral-200 leading-relaxed font-sans font-normal antialiased">
              {summaryNarrative}
            </p>
          </div>

          {/* Interactive Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Metric 1: Delta vs Field Median */}
            <div className="border border-[#1f2632] bg-[#161a20] p-2.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
                <span>VS FIELD MEDIAN</span>
                {deltaVsFieldMedian != null && (
                  deltaVsFieldMedian < 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  )
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-base font-bold timing-cell ${
                    deltaVsFieldMedian == null
                      ? 'text-neutral-400'
                      : deltaVsFieldMedian < 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatDelta(deltaVsFieldMedian).text}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {deltaVsFieldMedian != null && deltaVsFieldMedian < 0 ? 'FASTER' : 'SLOWER'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">
                Field Median: {formatLapTime(fieldMedianPace)}
              </div>
            </div>

            {/* Metric 2: Delta vs Rival */}
            <div className="border border-[#1f2632] bg-[#161a20] p-2.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
                <span>VS {rivalDriverInfo.entry?.driverCode || rivalDriverInfo.standing?.driver.code || 'RIVAL'}</span>
                <Trophy className="w-3 h-3 text-neutral-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-base font-bold timing-cell ${
                    deltaVsRival == null
                      ? 'text-neutral-400'
                      : deltaVsRival < 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {formatDelta(deltaVsRival).text}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {deltaVsRival != null && deltaVsRival < 0 ? 'GAINING' : 'LOSING'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 truncate">
                {rivalDriverInfo.titleContext || 'Championship competitor'}
              </div>
            </div>

            {/* Metric 3: Delta vs Leader / P1 */}
            <div className="border border-[#1f2632] bg-[#161a20] p-2.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
                <span>{favoriteEntry.position === 1 ? 'LEAD MARGIN (P2)' : 'DELTA TO P1'}</span>
                <Flame className="w-3 h-3 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-white timing-cell">
                  {favoriteEntry.position === 1
                    ? snapshot.entries[1]?.interval || 'LEADING'
                    : formatDelta(deltaVsLeader).text}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {favoriteEntry.position === 1 ? 'BUFFER' : 'GAP: ' + favoriteEntry.gap}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">
                Leader: {leaderEntry?.driverCode} ({formatLapTime(analytics.leaderPace)})
              </div>
            </div>

            {/* Metric 4: Tyre Stint & Wear Rate */}
            <div className="border border-[#1f2632] bg-[#161a20] p-2.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
                <span>TYRE DEGRADATION</span>
                <Shield className="w-3 h-3 text-neutral-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-white timing-cell">
                  +{estimatedDegPerLap?.toFixed(3)}s
                </span>
                <span className="text-[10px] text-neutral-500">/ LAP</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 truncate">
                {favoriteEntry.tyre.compound} · {favoriteEntry.tyre.age} laps old
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs: Clean segmented buttons (Functional controls allowed by constitution) */}
          <div className="flex items-center justify-between border-b border-[#202732] pt-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'summary'
                    ? 'border-red-600 text-white bg-[#151920]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Pace Delta Ladder
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sectors')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'sectors'
                    ? 'border-red-600 text-white bg-[#151920]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sector Telemetry
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'telemetry'
                    ? 'border-red-600 text-white bg-[#151920]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Championship Impact
              </button>
            </div>

            <div className="text-[10px] text-neutral-500 uppercase pb-1 hidden sm:block">
              ACTIVE COMPARISON BASELINE: {snapshot.sessionName || 'RACE'}
            </div>
          </div>

          {/* TAB 1: Pace Delta Ladder (Visual comparison bar) */}
          {activeTab === 'summary' && (
            <div className="border border-[#1f2632] bg-[#161a20] p-3 space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold uppercase text-[10px]">
                  RACE PACE DELTA VS THE FIELD (RELATIVE TO {favoriteEntry.driverCode})
                </span>
                <span className="text-[10px] text-neutral-500">LOWER LAP TIME = FASTER</span>
              </div>

              {/* Driver Pace Ladder List */}
              <div className="space-y-1.5">
                {paceRecords.slice(0, 8).map(record => {
                  const entry = record.entry;
                  const isFav = entry.driverNumber === favoriteEntry.driverNumber;
                  const deltaToFav = favoritePace != null ? record.paceInfo.pace - favoritePace : null;
                  const isFasterThanFav = deltaToFav != null && deltaToFav < 0;

                  return (
                    <div
                      key={entry.driverNumber}
                      onClick={() => onSelectDriver?.(entry)}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                        isFav
                          ? 'bg-[#202938] border-l-2 border-white'
                          : 'bg-[#111418] hover:bg-[#181d24]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="text-neutral-500 text-[11px] w-5">P{entry.position}</span>
                        <span
                          className="w-1.5 h-3 inline-block"
                          style={{ backgroundColor: entry.teamColor }}
                        />
                        <span className={`font-bold ${isFav ? 'text-white' : 'text-neutral-300'}`}>
                          {entry.driverCode}
                        </span>
                        <span className="text-[10px] text-neutral-500">#{entry.driverNumber}</span>
                        {isFav && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#e10600] text-white uppercase rounded-sm">
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Visual Bar representation */}
                      <div className="flex-1 max-w-xs mx-4 hidden md:block">
                        <div className="h-1.5 bg-[#1e2530] relative w-full overflow-hidden rounded-full">
                          <div
                            className={`h-full ${
                              isFav
                                ? 'bg-neutral-200'
                                : isFasterThanFav
                                ? 'bg-amber-500/80'
                                : 'bg-slate-500'
                            }`}
                            style={{
                              width: `${Math.max(
                                8,
                                Math.min(
                                  100,
                                  50 - (deltaToFav != null ? deltaToFav * 25 : 0)
                                )
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <span className="font-mono text-neutral-300 timing-cell">
                          {formatLapTime(record.paceInfo.pace)}
                        </span>
                        <span
                          className={`font-mono text-[11px] min-w-[70px] ${
                            isFav
                              ? 'text-neutral-400'
                              : isFasterThanFav
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {isFav ? 'BASELINE' : formatDelta(deltaToFav).text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#202732] text-[10px] text-neutral-500">
                <span>Green (+): Slower than {favoriteEntry.driverCode} · Amber (-): Faster</span>
                <span>Click any driver to inspect detailed telemetry</span>
              </div>
            </div>
          )}

          {/* TAB 2: Sector Telemetry Breakdown */}
          {activeTab === 'sectors' && (
            <div className="border border-[#1f2632] bg-[#161a20] p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase text-[10px] text-neutral-400">
                  SECTOR BREAKDOWN · {favoriteEntry.driverCode} VS SESSION BEST
                </span>
                <span className="text-[10px] text-neutral-500">
                  LAP {favoriteEntry.currentLap}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {favSectors.map(s => {
                  const isFastestInSession = s.status === 'overall-best';
                  const isPersonalBest = s.status === 'personal-best';

                  return (
                    <div
                      key={s.sector}
                      className="border border-[#232c3a] bg-[#111418] p-3 text-center relative"
                    >
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 uppercase mb-1">
                        <span>SECTOR {s.sector}</span>
                        {isFastestInSession ? (
                          <span className="text-purple-300 font-semibold text-[11px]">OVERALL BEST</span>
                        ) : isPersonalBest ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">PERSONAL BEST</span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">STANDARD</span>
                        )}
                      </div>

                      <div
                        className={`text-lg font-bold timing-cell ${
                          isFastestInSession
                            ? 'text-purple-200'
                            : isPersonalBest
                            ? 'text-emerald-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {s.timeStr}
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#1c222c] flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500">Delta vs Session Best:</span>
                        <span
                          className={`font-mono font-bold ${
                            s.delta != null && s.delta <= 0.001
                              ? 'text-purple-300'
                              : 'text-neutral-300'
                          }`}
                        >
                          {s.delta != null ? `+${s.delta.toFixed(3)}s` : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#101317] p-2.5 border border-[#202732] text-xs text-neutral-400 flex items-center gap-2 rounded">
                <Activity className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>
                  <strong>Sector Advantage:</strong> {favoriteEntry.driverCode}&apos;s key strength is{' '}
                  <strong>Sector {analytics.bestSector.sector}</strong> (+
                  {analytics.bestSector.delta?.toFixed(3) ?? '0.000'}s vs best), while time is being
                  conceded in <strong>Sector {analytics.weakestSector.sector}</strong> (+
                  {analytics.weakestSector.delta?.toFixed(3) ?? '0.000'}s).
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Championship Impact */}
          {activeTab === 'telemetry' && (
            <div className="border border-[#1f2632] bg-[#161a20] p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase text-[10px] text-neutral-400">
                  LIVE CHAMPIONSHIP STANDINGS PROJECTION
                </span>
                <span className="text-[10px] text-neutral-500">
                  BASED ON CURRENT RACE POSITIONS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Favorite Driver Championship Card */}
                <div className="border border-[#252f3e] bg-[#111418] p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#202732]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-3 inline-block"
                        style={{ backgroundColor: favoriteEntry.teamColor }}
                      />
                      <span className="font-bold text-white text-xs">{favoriteEntry.driverName}</span>
                    </div>
                    <span className="text-xs text-neutral-400">P{favoriteEntry.position} on track</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">CURRENT STANDING</span>
                      <span className="font-bold text-white">
                        {favoriteStanding ? `P${favoriteStanding.position}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">BASE POINTS</span>
                      <span className="font-bold text-white">
                        {favoriteStanding ? `${favoriteStanding.points} pts` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">RACE POINTS</span>
                      <span className="font-bold text-emerald-400">+{virtualPoints} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">PROPOSING TOTAL</span>
                      <span className="font-bold text-white">
                        {favoriteStanding ? `${favoriteStanding.points + virtualPoints} pts` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rival Championship Card */}
                <div className="border border-[#252f3e] bg-[#111418] p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#202732]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-3 inline-block"
                        style={{ backgroundColor: rivalDriverInfo.entry?.teamColor || '#555' }}
                      />
                      <span className="font-bold text-white text-xs">
                        {rivalDriverInfo.entry?.driverName || rivalDriverInfo.standing?.driver.fullName || 'Title Rival'}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {rivalDriverInfo.entry ? `P${rivalDriverInfo.entry.position} on track` : 'Competitor'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">CURRENT STANDING</span>
                      <span className="font-bold text-white">
                        {rivalDriverInfo.standing ? `P${rivalDriverInfo.standing.position}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">BASE POINTS</span>
                      <span className="font-bold text-white">
                        {rivalDriverInfo.standing ? `${rivalDriverInfo.standing.points} pts` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">RACE POINTS</span>
                      <span className="font-bold text-neutral-300">+{analytics.rivalVirtualPoints} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">NET SWING</span>
                      <span
                        className={`font-bold ${
                          virtualPointsSwing > 0
                            ? 'text-emerald-400'
                            : virtualPointsSwing < 0
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {virtualPointsSwing > 0 ? `+${virtualPointsSwing}` : virtualPointsSwing} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Driver Comparison Dock */}
          <div className="pt-2 border-t border-[#202732] flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span className="text-neutral-500">QUICK COMPARE FAVORITE:</span>
            <div className="flex flex-wrap gap-1">
              {snapshot.entries.slice(0, 10).map(e => (
                <button
                  key={e.driverNumber}
                  type="button"
                  onClick={() => handleSetFavoriteDriver(e.driverNumber)}
                  className={`px-2 py-0.5 text-[10px] border transition-colors ${
                    e.driverNumber === favoriteEntry.driverNumber
                      ? 'border-white text-white bg-[#222a36] font-bold'
                      : 'border-[#242c37] text-neutral-400 hover:text-white hover:border-[#384556] bg-[#0d1014]'
                  }`}
                  style={{
                    borderLeftColor: e.teamColor,
                    borderLeftWidth: '3px'
                  }}
                >
                  {e.driverCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
