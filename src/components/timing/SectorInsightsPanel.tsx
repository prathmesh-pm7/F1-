import React, { useMemo } from 'react';
import { TimingEntry, LiveSessionSnapshot, LapTelemetry, SectorTime } from '../../types/f1';
import {
  Activity,
  Award,
  Zap,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkle,
  X
} from 'lucide-react';

export interface SectorInsightsPanelProps {
  selectedDriver: TimingEntry;
  snapshot: LiveSessionSnapshot;
  completedLaps?: LapTelemetry[];
  activeSectorHighlight?: 1 | 2 | 3 | null;
  onSelectSectorHighlight?: (sector: 1 | 2 | 3 | null) => void;
  onClose?: () => void;
  className?: string;
}

interface SectorSummary {
  sector: 1 | 2 | 3;
  name: string;
  driverSplitStr: string;
  driverSplitSec: number | null;
  status: 'overall-best' | 'personal-best' | 'normal' | 'pit' | 'unknown';
  sessionBestSec: number | null;
  sessionBestHolder: string;
  personalBestSec: number | null;
  leaderSplitSec: number | null;
  deltaToSessionBest: number | null;
  deltaToLeader: number | null;
  turnRange: string;
  characteristics: string;
}

const parseLapTimeToSeconds = (str?: string): number | null => {
  if (!str || str === '—' || str.trim() === '') return null;
  const parts = str.split(':');
  if (parts.length === 2) {
    const min = parseFloat(parts[0]);
    const sec = parseFloat(parts[1]);
    if (!isNaN(min) && !isNaN(sec)) return min * 60 + sec;
  }
  const val = parseFloat(str);
  return isNaN(val) ? null : val;
};

const formatSeconds = (sec: number | null | undefined): string => {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '—';
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = (sec - m * 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
  }
  return `${sec.toFixed(3)}s`;
};

export const SectorInsightsPanel: React.FC<SectorInsightsPanelProps> = ({
  selectedDriver,
  snapshot,
  completedLaps = [],
  activeSectorHighlight,
  onSelectSectorHighlight,
  onClose,
  className = ''
}) => {
  const leaderEntry = useMemo(() => {
    return snapshot.entries.find(e => e.position === 1) || snapshot.entries[0];
  }, [snapshot.entries]);

  // Retrieve driver completed laps
  const driverCompletedLaps = useMemo(() => {
    return completedLaps
      .filter(l => l.driverNumber === selectedDriver.driverNumber)
      .sort((a, b) => a.lapNumber - b.lapNumber);
  }, [completedLaps, selectedDriver.driverNumber]);

  // Calculate session best sectors across all completed laps or entries
  const sessionBests = useMemo(() => {
    let s1Min = Infinity;
    let s1Holder = '—';
    let s2Min = Infinity;
    let s2Holder = '—';
    let s3Min = Infinity;
    let s3Holder = '—';

    // 1. Check all completed laps
    completedLaps.forEach(lap => {
      if (lap.sector1 && lap.sector1 > 0 && lap.sector1 < s1Min) {
        s1Min = lap.sector1;
        s1Holder = lap.driverCode;
      }
      if (lap.sector2 && lap.sector2 > 0 && lap.sector2 < s2Min) {
        s2Min = lap.sector2;
        s2Holder = lap.driverCode;
      }
      if (lap.sector3 && lap.sector3 > 0 && lap.sector3 < s3Min) {
        s3Min = lap.sector3;
        s3Holder = lap.driverCode;
      }
    });

    // 2. Also check current snapshot entries
    snapshot.entries.forEach(entry => {
      const eS1 = entry.sectors[0]?.seconds;
      if (eS1 && eS1 > 0 && eS1 < s1Min) {
        s1Min = eS1;
        s1Holder = entry.driverCode;
      }
      const eS2 = entry.sectors[1]?.seconds;
      if (eS2 && eS2 > 0 && eS2 < s2Min) {
        s2Min = eS2;
        s2Holder = entry.driverCode;
      }
      const eS3 = entry.sectors[2]?.seconds;
      if (eS3 && eS3 > 0 && eS3 < s3Min) {
        s3Min = eS3;
        s3Holder = entry.driverCode;
      }
    });

    return {
      s1: Number.isFinite(s1Min) ? s1Min : null,
      s1Holder: s1Holder !== '—' ? s1Holder : (leaderEntry?.driverCode || 'P1'),
      s2: Number.isFinite(s2Min) ? s2Min : null,
      s2Holder: s2Holder !== '—' ? s2Holder : (leaderEntry?.driverCode || 'P1'),
      s3: Number.isFinite(s3Min) ? s3Min : null,
      s3Holder: s3Holder !== '—' ? s3Holder : (leaderEntry?.driverCode || 'P1')
    };
  }, [completedLaps, snapshot.entries, leaderEntry]);

  // Driver personal best sectors
  const personalBests = useMemo(() => {
    let s1 = Infinity;
    let s2 = Infinity;
    let s3 = Infinity;

    driverCompletedLaps.forEach(lap => {
      if (lap.sector1 && lap.sector1 > 0 && lap.sector1 < s1) s1 = lap.sector1;
      if (lap.sector2 && lap.sector2 > 0 && lap.sector2 < s2) s2 = lap.sector2;
      if (lap.sector3 && lap.sector3 > 0 && lap.sector3 < s3) s3 = lap.sector3;
    });

    // Fallback to current sector seconds if present and smaller
    const curS1 = selectedDriver.sectors[0]?.seconds;
    if (curS1 && curS1 > 0 && curS1 < s1) s1 = curS1;
    const curS2 = selectedDriver.sectors[1]?.seconds;
    if (curS2 && curS2 > 0 && curS2 < s2) s2 = curS2;
    const curS3 = selectedDriver.sectors[2]?.seconds;
    if (curS3 && curS3 > 0 && curS3 < s3) s3 = curS3;

    return {
      s1: Number.isFinite(s1) ? s1 : (curS1 || null),
      s2: Number.isFinite(s2) ? s2 : (curS2 || null),
      s3: Number.isFinite(s3) ? s3 : (curS3 || null)
    };
  }, [driverCompletedLaps, selectedDriver.sectors]);

  // Construct sector split summaries
  const sectorsSummary: SectorSummary[] = useMemo(() => {
    const s1Entry = selectedDriver.sectors[0];
    const s2Entry = selectedDriver.sectors[1];
    const s3Entry = selectedDriver.sectors[2];

    const s1Sec = s1Entry?.seconds || parseLapTimeToSeconds(s1Entry?.timeStr) || personalBests.s1;
    const s2Sec = s2Entry?.seconds || parseLapTimeToSeconds(s2Entry?.timeStr) || personalBests.s2;
    const s3Sec = s3Entry?.seconds || parseLapTimeToSeconds(s3Entry?.timeStr) || personalBests.s3;

    const leaderS1 = leaderEntry?.sectors[0]?.seconds || parseLapTimeToSeconds(leaderEntry?.sectors[0]?.timeStr) || sessionBests.s1;
    const leaderS2 = leaderEntry?.sectors[1]?.seconds || parseLapTimeToSeconds(leaderEntry?.sectors[1]?.timeStr) || sessionBests.s2;
    const leaderS3 = leaderEntry?.sectors[2]?.seconds || parseLapTimeToSeconds(leaderEntry?.sectors[2]?.timeStr) || sessionBests.s3;

    const buildSector = (
      sector: 1 | 2 | 3,
      name: string,
      driverSec: number | null,
      rawSectorObj: SectorTime | undefined,
      sessionBest: number | null,
      sessionHolder: string,
      personalBest: number | null,
      leaderSec: number | null,
      turnRange: string,
      characteristics: string
    ): SectorSummary => {
      let status: 'overall-best' | 'personal-best' | 'normal' | 'pit' | 'unknown' = rawSectorObj?.status || 'normal';
      if (driverSec && sessionBest && Math.abs(driverSec - sessionBest) < 0.01) {
        status = 'overall-best';
      } else if (driverSec && personalBest && Math.abs(driverSec - personalBest) < 0.01) {
        status = 'personal-best';
      }

      const deltaToSession = driverSec && sessionBest ? driverSec - sessionBest : null;
      const deltaToLead = driverSec && leaderSec ? driverSec - leaderSec : null;

      const timeStr = driverSec ? `${driverSec.toFixed(3)}s` : (rawSectorObj?.timeStr && rawSectorObj.timeStr !== '—' ? `${rawSectorObj.timeStr}s` : '—');

      return {
        sector,
        name,
        driverSplitStr: timeStr,
        driverSplitSec: driverSec,
        status,
        sessionBestSec: sessionBest,
        sessionBestHolder: sessionHolder,
        personalBestSec: personalBest,
        leaderSplitSec: leaderSec,
        deltaToSessionBest: deltaToSession,
        deltaToLeader: deltaToLead,
        turnRange,
        characteristics
      };
    };

    return [
      buildSector(
        1,
        'SECTOR 1',
        s1Sec,
        s1Entry,
        sessionBests.s1,
        sessionBests.s1Holder,
        personalBests.s1,
        leaderS1,
        'Turns 1 – 4',
        'High-speed entry & initial braking zone'
      ),
      buildSector(
        2,
        'SECTOR 2',
        s2Sec,
        s2Entry,
        sessionBests.s2,
        sessionBests.s2Holder,
        personalBests.s2,
        leaderS2,
        'Turns 5 – 10',
        'Technical mid-sector & traction complex'
      ),
      buildSector(
        3,
        'SECTOR 3',
        s3Sec,
        s3Entry,
        sessionBests.s3,
        sessionBests.s3Holder,
        personalBests.s3,
        leaderS3,
        'Turns 11 – 14',
        'Final sweepers & start/finish straight'
      )
    ];
  }, [selectedDriver.sectors, personalBests, leaderEntry, sessionBests]);

  // Theoretical / Optimal Lap calculation
  const optimalTelemetry = useMemo(() => {
    const s1 = personalBests.s1;
    const s2 = personalBests.s2;
    const s3 = personalBests.s3;

    const actualBestSec = parseLapTimeToSeconds(selectedDriver.bestLapTime);

    if (s1 && s2 && s3) {
      const optimalSec = s1 + s2 + s3;
      const potentialGain = actualBestSec ? actualBestSec - optimalSec : null;
      return {
        optimalSec,
        optimalStr: formatSeconds(optimalSec),
        actualBestSec,
        actualBestStr: selectedDriver.bestLapTime || '—',
        potentialGain: potentialGain && potentialGain > 0 ? potentialGain : null
      };
    }

    return {
      optimalSec: null,
      optimalStr: '—',
      actualBestSec,
      actualBestStr: selectedDriver.bestLapTime || '—',
      potentialGain: null
    };
  }, [personalBests, selectedDriver.bestLapTime]);

  const teamColor = selectedDriver.teamColor || '#e10600';

  return (
    <div
      className={`border border-[#222933] text-neutral-200 rounded shadow-2xl overflow-hidden flex flex-col ${className}`}
      style={{
        borderLeft: `4px solid ${teamColor}`,
        background: `linear-gradient(180deg, ${teamColor}12 0%, rgba(18, 23, 31, 0.95) 120px, rgba(13, 16, 21, 0.98) 100%)`,
        boxShadow: `0 8px 32px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
      }}
      role="region"
      aria-label={`Sector Insights for #${selectedDriver.driverNumber} ${selectedDriver.driverCode}`}
    >
      {/* Panel Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#222933]"
        style={{
          background: `linear-gradient(90deg, ${teamColor}1a 0%, #161a20 40%, #161a20 100%)`
        }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-neutral-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              SECTOR INSIGHTS
            </span>
            <span className="text-neutral-500 text-xs">·</span>
            <span className="text-xs text-neutral-400 font-semibold">SPLIT TELEMETRY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Driver Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#0e1115] border border-[#2b3544] px-2 py-0.5 rounded text-xs">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: teamColor }}
            />
            <span className="font-bold text-white font-mono">P{selectedDriver.position}</span>
            <span className="font-bold text-white font-mono">#{selectedDriver.driverNumber}</span>
            <span className="font-semibold text-neutral-300">{selectedDriver.driverCode}</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#202732] transition"
              title="Close Sector Insights"
              aria-label="Close Sector Insights"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Driver context sub-strip */}
      <div className="px-3.5 py-2 bg-[#0e1115] border-b border-[#1b212b] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-[11px] uppercase font-semibold">DRIVER:</span>
          <span className="font-bold text-white">{selectedDriver.driverName}</span>
          <span className="text-neutral-500">({selectedDriver.teamName})</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div>
            <span className="text-neutral-500 uppercase mr-1">LAP:</span>
            <span className="text-white font-bold">{selectedDriver.currentLap}</span>
          </div>
          <div>
            <span className="text-neutral-500 uppercase mr-1">LAST:</span>
            <span className="text-neutral-200">{selectedDriver.lastLapTime || '—'}</span>
          </div>
          <div>
            <span className="text-neutral-500 uppercase mr-1">BEST:</span>
            <span className="text-emerald-400 font-bold">{selectedDriver.bestLapTime || '—'}</span>
          </div>
        </div>
      </div>

      {/* The 3 Sector Cards Grid */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {sectorsSummary.map(sec => {
          const isHighlighted = activeSectorHighlight === sec.sector;

          // Status Badge styling
          let statusBadge = (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1f2733] text-neutral-300 border border-[#2e3b4e]">
              NORMAL
            </span>
          );
          if (sec.status === 'overall-best') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-500/50">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                SESSION BEST
              </span>
            );
          } else if (sec.status === 'personal-best') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-500/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                PERSONAL BEST
              </span>
            );
          }

          const sectorStyle = {
            1: {
              accent: '#38bdf8',
              bg: isHighlighted
                ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(14, 165, 233, 0.07) 0%, rgba(15, 21, 30, 0.95) 100%)',
              border: isHighlighted ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.25)',
              tagBg: 'rgba(14, 165, 233, 0.15)',
              tagText: '#7dd3fc',
              tagBorder: 'rgba(56, 189, 248, 0.35)'
            },
            2: {
              accent: '#facc15',
              bg: isHighlighted
                ? 'linear-gradient(180deg, rgba(234, 179, 8, 0.18) 0%, rgba(26, 22, 14, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(234, 179, 8, 0.07) 0%, rgba(20, 19, 17, 0.95) 100%)',
              border: isHighlighted ? 'rgba(234, 179, 8, 0.7)' : 'rgba(234, 179, 8, 0.25)',
              tagBg: 'rgba(234, 179, 8, 0.15)',
              tagText: '#fde047',
              tagBorder: 'rgba(234, 179, 8, 0.35)'
            },
            3: {
              accent: '#d8b4fe',
              bg: isHighlighted
                ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.18) 0%, rgba(24, 16, 33, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(168, 85, 247, 0.07) 0%, rgba(19, 16, 26, 0.95) 100%)',
              border: isHighlighted ? 'rgba(168, 85, 247, 0.7)' : 'rgba(168, 85, 247, 0.25)',
              tagBg: 'rgba(168, 85, 247, 0.15)',
              tagText: '#e9d5ff',
              tagBorder: 'rgba(168, 85, 247, 0.35)'
            }
          }[sec.sector];

          return (
            <div
              key={sec.sector}
              onClick={() => onSelectSectorHighlight && onSelectSectorHighlight(isHighlighted ? null : sec.sector)}
              className={`p-3 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                isHighlighted ? 'ring-1 ring-white/30 shadow-lg' : 'hover:brightness-110'
              }`}
              style={{
                background: sectorStyle.bg,
                borderColor: sectorStyle.border
              }}
            >
              <div>
                {/* Sector Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-bold uppercase font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: sectorStyle.tagBg,
                        color: sectorStyle.tagText,
                        borderColor: sectorStyle.tagBorder
                      }}
                    >
                      S{sec.sector}
                    </span>
                    <span className="text-xs font-bold text-white">{sec.name}</span>
                  </div>
                  {statusBadge}
                </div>

                {/* Primary Split Time */}
                <div className="mb-2">
                  <div className="text-[11px] text-neutral-400 uppercase font-semibold">
                    SPLIT TIME
                  </div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white mt-0.5">
                    {sec.driverSplitStr}
                  </div>
                </div>

                {/* Deltas & Benchmark Comparison */}
                <div className="space-y-1.5 text-xs font-mono border-t border-[#232b38] pt-2 mt-1">
                  {/* Delta to Session Best */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-sans">VS PURPLE:</span>
                    {sec.deltaToSessionBest != null ? (
                      sec.deltaToSessionBest <= 0.005 ? (
                        <span className="text-purple-400 font-bold">PURPLE (BEST)</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">
                          +{sec.deltaToSessionBest.toFixed(3)}s
                        </span>
                      )
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </div>

                  {/* Delta to Leader */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-sans">VS LEADER:</span>
                    {selectedDriver.position === 1 ? (
                      <span className="text-neutral-400">P1 (LEAD)</span>
                    ) : sec.deltaToLeader != null ? (
                      sec.deltaToLeader <= 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          {sec.deltaToLeader.toFixed(3)}s
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">
                          +{sec.deltaToLeader.toFixed(3)}s
                        </span>
                      )
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </div>

                  {/* Personal Best Benchmark */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-sans">DRIVER PB:</span>
                    <span className="text-neutral-300">
                      {formatSeconds(sec.personalBestSec)}
                    </span>
                  </div>

                  {/* Session Record */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-sans">SESSION REC:</span>
                    <span className="text-purple-300">
                      {formatSeconds(sec.sessionBestSec)} ({sec.sessionBestHolder})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Hint / Highlight Toggle */}
              <div className="mt-3 pt-2 border-t border-[#202834] flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-sans">{sec.turnRange}</span>
                <span className={`text-[10px] font-bold uppercase transition ${
                  isHighlighted ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                }`}>
                  {isHighlighted ? 'HIGHLIGHTED ON MAP' : 'HIGHLIGHT ON MAP'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optimal Lap Telemetry Strip */}
      <div
        className="px-3.5 py-2.5 border-t border-[#222933] flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.09) 0%, rgba(16, 24, 22, 0.6) 40%, rgba(15, 19, 26, 0.95) 100%)'
        }}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[11px] font-bold uppercase text-neutral-300">
              OPTIMAL THEORETICAL LAP
            </div>
            <div className="text-[11px] text-neutral-400 font-sans">
              Best S1 ({formatSeconds(personalBests.s1)}) + S2 ({formatSeconds(personalBests.s2)}) + S3 ({formatSeconds(personalBests.s3)})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div>
            <span className="text-neutral-400 text-[11px] uppercase mr-1.5 font-sans">THEORETICAL:</span>
            <span className="text-emerald-400 font-bold text-sm">
              {optimalTelemetry.optimalStr}
            </span>
          </div>

          <div>
            <span className="text-neutral-400 text-[11px] uppercase mr-1.5 font-sans">ACTUAL BEST:</span>
            <span className="text-white font-bold text-sm">
              {optimalTelemetry.actualBestStr}
            </span>
          </div>

          {optimalTelemetry.potentialGain && (
            <div className="bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>POTENTIAL GAIN: -{optimalTelemetry.potentialGain.toFixed(3)}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
