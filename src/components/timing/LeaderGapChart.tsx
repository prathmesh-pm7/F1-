import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  LiveSessionSnapshot,
  TimingEntry,
  Team,
  LapTelemetry
} from '../../types/f1';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  Clock,
  Wrench,
  Flame,
  Info
} from 'lucide-react';

export interface LeaderGapChartProps {
  snapshot: LiveSessionSnapshot;
  favoriteDriverNumber?: number | null;
  favoriteTeam?: Team | null;
  completedLaps?: LapTelemetry[];
  onSelectDriver?: (entry: TimingEntry) => void;
  onSelectFavoriteDriver?: (driverNumber: number) => void;
}

export interface LapGapPoint {
  lap: number;
  gapSeconds: number; // 0 if leader
  formattedGap: string; // "+2.345s" or "LEADER"
  leaderCode: string;
  leaderNumber: number;
  driverCode: string;
  driverNumber: number;
  driverPosition: number;
  driverLapDuration?: number;
  leaderLapDuration?: number;
  deltaToPrevLap?: number; // negative = gained, positive = lost
  isLeader: boolean;
  isPitLap?: boolean;
}

const FAVORITE_DRIVER_STORAGE_KEY = 'f1-pulse.favorite-driver-number';

export const LeaderGapChart: React.FC<LeaderGapChartProps> = ({
  snapshot,
  favoriteDriverNumber: externalFavNum,
  favoriteTeam,
  completedLaps = [],
  onSelectDriver,
  onSelectFavoriteDriver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const [rangeFilter, setRangeFilter] = useState<'all' | '10' | '20'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<LapGapPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Local storage synced driver selection
  const [internalFavNum, setInternalFavNum] = useState<number | null>(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITE_DRIVER_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });

  const activeDriverNum = externalFavNum ?? internalFavNum;

  const handleSelectDriver = (num: number) => {
    setInternalFavNum(num);
    try {
      window.localStorage.setItem(FAVORITE_DRIVER_STORAGE_KEY, String(num));
    } catch {
      /* optional storage */
    }
    if (onSelectFavoriteDriver) {
      onSelectFavoriteDriver(num);
    }
    const entry = snapshot.entries.find(e => e.driverNumber === num);
    if (entry && onSelectDriver) {
      onSelectDriver(entry);
    }
  };

  // Determine active driver entry
  const activeEntry = useMemo<TimingEntry | null>(() => {
    if (!snapshot.entries || snapshot.entries.length === 0) return null;

    if (activeDriverNum != null) {
      const match = snapshot.entries.find(e => e.driverNumber === activeDriverNum);
      if (match) return match;
    }

    if (favoriteTeam) {
      const teamDrivers = snapshot.entries.filter(
        e => e.teamName === favoriteTeam.name || e.teamName === favoriteTeam.fullName
      );
      if (teamDrivers.length > 0) {
        return teamDrivers.sort((a, b) => a.position - b.position)[0];
      }
    }

    // Default to P2 (if exists to show gap) or P1
    if (snapshot.entries.length > 1) {
      return snapshot.entries[1];
    }
    return snapshot.entries[0] || null;
  }, [snapshot.entries, activeDriverNum, favoriteTeam]);

  // Track live cumulative gaps buffer when running live timing
  const liveGapHistoryRef = useRef<Map<number, LapGapPoint>>(new Map());

  // Update live gap buffer with current snapshot entry
  useEffect(() => {
    if (!activeEntry || !snapshot.currentLap) return;
    const currentLap = snapshot.currentLap;
    if (currentLap <= 0) return;

    const leader = snapshot.entries[0];
    if (!leader) return;

    let gapSec = 0;
    if (activeEntry.position > 1) {
      if (activeEntry.gapToLeaderSeconds != null && Number.isFinite(activeEntry.gapToLeaderSeconds)) {
        gapSec = activeEntry.gapToLeaderSeconds;
      } else if (activeEntry.gap && activeEntry.gap !== 'LEADER' && activeEntry.gap !== '—') {
        const parsed = parseFloat(activeEntry.gap.replace('+', '').replace('s', ''));
        if (Number.isFinite(parsed)) gapSec = parsed;
      }
    }

    const prevPoint = liveGapHistoryRef.current.get(currentLap - 1);
    const delta = prevPoint ? gapSec - prevPoint.gapSeconds : undefined;

    liveGapHistoryRef.current.set(currentLap, {
      lap: currentLap,
      gapSeconds: Math.max(0, gapSec),
      formattedGap: activeEntry.position === 1 ? 'LEADER' : `+${gapSec.toFixed(3)}s`,
      leaderCode: leader.driverCode,
      leaderNumber: leader.driverNumber,
      driverCode: activeEntry.driverCode,
      driverNumber: activeEntry.driverNumber,
      driverPosition: activeEntry.position,
      deltaToPrevLap: delta,
      isLeader: activeEntry.position === 1,
      isPitLap: Boolean(activeEntry.inPit || activeEntry.lastPitLap === currentLap)
    });
  }, [snapshot.currentLap, activeEntry, snapshot.entries]);

  // Compute full lap-by-lap gap telemetry dataset
  const gapData = useMemo<LapGapPoint[]>(() => {
    if (!activeEntry) return [];

    const driverNum = activeEntry.driverNumber;
    const currentLap = snapshot.currentLap || activeEntry.currentLap || 1;

    // Strategy 1: Compute from completedLaps if available
    if (completedLaps.length > 0) {
      const lapsByLapNum = new Map<number, LapTelemetry[]>();
      completedLaps.forEach(l => {
        if (l.lapNumber <= currentLap && l.lapNumber > 0) {
          const list = lapsByLapNum.get(l.lapNumber) || [];
          list.push(l);
          lapsByLapNum.set(l.lapNumber, list);
        }
      });

      const sortedLapNums = Array.from(lapsByLapNum.keys()).sort((a, b) => a - b);
      const cumTimeMap = new Map<number, number>();
      const result: LapGapPoint[] = [];

      for (const lapNum of sortedLapNums) {
        const driversInLap = lapsByLapNum.get(lapNum) || [];

        // Accumulate cumulative time for each driver
        for (const record of driversInLap) {
          const dur =
            record.lapDuration != null && Number.isFinite(record.lapDuration) && record.lapDuration > 0
              ? record.lapDuration
              : null;
          if (dur != null) {
            cumTimeMap.set(record.driverNumber, (cumTimeMap.get(record.driverNumber) || 0) + dur);
          }
        }

        // Find leader on this lap (minimum cumulative time)
        let leaderNum: number | null = null;
        let leaderTime = Infinity;
        let leaderLapRecord: LapTelemetry | null = null;

        for (const record of driversInLap) {
          const t = cumTimeMap.get(record.driverNumber);
          if (t != null && t < leaderTime) {
            leaderTime = t;
            leaderNum = record.driverNumber;
            leaderLapRecord = record;
          }
        }

        const favCumTime = cumTimeMap.get(driverNum);
        const favLapRecord = driversInLap.find(d => d.driverNumber === driverNum);

        if (favCumTime != null && Number.isFinite(leaderTime) && leaderTime < Infinity) {
          const gapSec = Math.max(0, favCumTime - leaderTime);
          const isLeader = leaderNum === driverNum || gapSec < 0.001;
          const prevPoint = result[result.length - 1];
          const delta = prevPoint ? gapSec - prevPoint.gapSeconds : undefined;

          // Check if driver pitted on this lap (stint change or lap time > 125% of baseline)
          const isPit =
            Boolean(activeEntry.lastPitLap === lapNum) ||
            (favLapRecord?.lapDuration != null &&
              leaderLapRecord?.lapDuration != null &&
              favLapRecord.lapDuration > leaderLapRecord.lapDuration + 14);

          result.push({
            lap: lapNum,
            gapSeconds: isLeader ? 0 : gapSec,
            formattedGap: isLeader ? 'LEADER' : `+${gapSec.toFixed(3)}s`,
            leaderCode: leaderLapRecord?.driverCode || 'P1',
            leaderNumber: leaderNum || 0,
            driverCode: activeEntry.driverCode,
            driverNumber: driverNum,
            driverPosition: isLeader ? 1 : activeEntry.position,
            driverLapDuration: favLapRecord?.lapDuration,
            leaderLapDuration: leaderLapRecord?.lapDuration,
            deltaToPrevLap: delta,
            isLeader,
            isPitLap: isPit
          });
        }
      }

      if (result.length > 0) {
        return result;
      }
    }

    // Strategy 2: Fallback to live buffer or generated trend from snapshot
    const bufferArray = Array.from(liveGapHistoryRef.current.values()).sort((a, b) => a.lap - b.lap);
    if (bufferArray.length >= 2) {
      return bufferArray;
    }

    // Strategy 3: Single point / current baseline
    const currentGapSec = activeEntry.position === 1 ? 0 : (activeEntry.gapToLeaderSeconds || 2.5);
    return [
      {
        lap: currentLap,
        gapSeconds: currentGapSec,
        formattedGap: activeEntry.position === 1 ? 'LEADER' : `+${currentGapSec.toFixed(3)}s`,
        leaderCode: snapshot.entries[0]?.driverCode || 'P1',
        leaderNumber: snapshot.entries[0]?.driverNumber || 0,
        driverCode: activeEntry.driverCode,
        driverNumber: activeEntry.driverNumber,
        driverPosition: activeEntry.position,
        isLeader: activeEntry.position === 1
      }
    ];
  }, [completedLaps, activeEntry, snapshot]);

  // Apply range filter (all, last 10 laps, last 20 laps)
  const filteredData = useMemo(() => {
    if (rangeFilter === 'all' || gapData.length <= 10) return gapData;
    const count = rangeFilter === '10' ? 10 : 20;
    return gapData.slice(-count);
  }, [gapData, rangeFilter]);

  // Telemetry statistics
  const stats = useMemo(() => {
    if (gapData.length === 0) return null;

    const currentPoint = gapData[gapData.length - 1];
    const firstPoint = gapData[0];
    const nonZeroGaps = gapData.filter(d => !d.isLeader).map(d => d.gapSeconds);
    const minGap = nonZeroGaps.length > 0 ? Math.min(...nonZeroGaps) : 0;
    const maxGap = gapData.length > 0 ? Math.max(...gapData.map(d => d.gapSeconds)) : 0;

    // Rate of change over last 3-5 laps
    let recentTrend: 'gaining' | 'losing' | 'stable' = 'stable';
    let avgDeltaPerLap = 0;
    if (gapData.length >= 3) {
      const slice = gapData.slice(-4);
      const deltaTotal = slice[slice.length - 1].gapSeconds - slice[0].gapSeconds;
      avgDeltaPerLap = deltaTotal / (slice.length - 1);
      if (avgDeltaPerLap < -0.05) recentTrend = 'gaining';
      else if (avgDeltaPerLap > 0.05) recentTrend = 'losing';
    }

    const lapsInDrs = gapData.filter(d => !d.isLeader && d.gapSeconds <= 1.0).length;

    return {
      currentGap: currentPoint.formattedGap,
      currentGapSec: currentPoint.gapSeconds,
      isLeader: currentPoint.isLeader,
      minGap,
      maxGap,
      recentTrend,
      avgDeltaPerLap,
      lapsInDrs,
      totalLapsRecorded: gapData.length
    };
  }, [gapData]);

  // Render D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const height = 260;
    const margin = { top: 25, right: 35, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'overflow-visible font-mono text-xs');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Lap numbers
    const xExtent = d3.extent(filteredData, d => d.lap) as [number, number];
    const xMin = xExtent[0] != null ? xExtent[0] : 1;
    const xMax = xExtent[1] != null && xExtent[1] > xMin ? xExtent[1] : xMin + 1;

    const xScale = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .range([0, innerWidth]);

    // Y Scale: Gap to leader in seconds (0.0s at bottom)
    const maxDataGap = d3.max(filteredData, d => d.gapSeconds) || 5;
    const yMax = Math.max(2.5, Math.ceil(maxDataGap * 1.2));

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0])
      .nice();

    const teamAccent = activeEntry?.teamColor || '#e10600';

    // Gradients
    const defs = svg.append('defs');

    // Area fill gradient (clean team-colored tint under curve)
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'gap-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', teamAccent)
      .attr('stop-opacity', 0.25);

    areaGradient
      .append('stop')
      .attr('offset', '65%')
      .attr('stop-color', teamAccent)
      .attr('stop-opacity', 0.08);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', teamAccent)
      .attr('stop-opacity', 0.01);

    // Subtle horizontal gridlines
    const yTicks = yScale.ticks(5);
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#1e242f')
      .attr('stroke-dasharray', '3,3');

    // DRS 1.0s Threshold Line (if within range)
    if (yMax >= 1.0) {
      const drsY = yScale(1.0);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', drsY)
        .attr('y2', drsY)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', drsY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('DRS 1.0s WINDOW');
    }

    // Leader Baseline (0.0s)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', innerHeight)
      .attr('y2', innerHeight)
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.2);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(filteredData.length, 10))
      .tickFormat(d => `L${d}`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call(axis => axis.select('.domain').attr('stroke', '#273140'))
      .call(axis => axis.selectAll('.tick line').attr('stroke', '#273140'))
      .call(axis =>
        axis
          .selectAll('.tick text')
          .attr('fill', '#94a3b8')
          .attr('font-size', '11px')
      );

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => (d === 0 ? 'P1' : `+${d}s`));

    g.append('g')
      .call(yAxis)
      .call(axis => axis.select('.domain').attr('stroke', '#273140'))
      .call(axis => axis.selectAll('.tick line').attr('stroke', '#273140'))
      .call(axis =>
        axis
          .selectAll('.tick text')
          .attr('fill', '#94a3b8')
          .attr('font-size', '11px')
      );

    // D3 Area Generator
    const areaGenerator = d3
      .area<LapGapPoint>()
      .x(d => xScale(d.lap))
      .y0(innerHeight)
      .y1(d => yScale(d.gapSeconds))
      .curve(filteredData.length > 2 ? d3.curveMonotoneX : d3.curveLinear);

    // D3 Line Generator
    const lineGenerator = d3
      .line<LapGapPoint>()
      .x(d => xScale(d.lap))
      .y(d => yScale(d.gapSeconds))
      .curve(filteredData.length > 2 ? d3.curveMonotoneX : d3.curveLinear);

    // Render Area (subtle)
    g.append('path')
      .datum(filteredData)
      .attr('fill', 'url(#gap-area-gradient)')
      .attr('d', areaGenerator);

    // Render Main Telemetry Line
    g.append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', teamAccent)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Data points & Pit Stop Markers
    filteredData.forEach(d => {
      const cx = xScale(d.lap);
      const cy = yScale(d.gapSeconds);

      if (d.isPitLap) {
        // Pit Stop marker: Subtle tag
        const pitGroup = g.append('g').attr('transform', `translate(${cx},${cy})`);

        pitGroup
          .append('circle')
          .attr('r', 5.5)
          .attr('fill', '#1e293b')
          .attr('stroke', '#475569')
          .attr('stroke-width', 1);

        pitGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-weight', '700')
          .text('P');
      } else {
        // Regular telemetry circle point
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', d.isLeader ? 3.5 : 2.5)
          .attr('fill', d.isLeader ? '#ffffff' : teamAccent)
          .attr('stroke', '#0e1115')
          .attr('stroke-width', 1);
      }
    });

    // Hover Crosshair group (hidden initially)
    const focusGroup = g.append('g').style('display', 'none');

    const focusLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#475569')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    const focusCircle = focusGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#ffffff')
      .attr('stroke', teamAccent)
      .attr('stroke-width', 1.5);

    // Transparent mouse overlay to capture hover
    const bisectLap = d3.bisector<LapGapPoint, number>(d => d.lap).left;

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', event => {
        const [mx, my] = d3.pointer(event, g.node());
        if (mx < 0 || mx > innerWidth || my < 0 || my > innerHeight) {
          focusGroup.style('display', 'none');
          setHoveredPoint(null);
          setTooltipPos(null);
          return;
        }

        const x0 = xScale.invert(mx);
        const index = bisectLap(filteredData, x0, 1);
        const d0 = filteredData[index - 1];
        const d1 = filteredData[index];
        let d = d0;
        if (d1 && d0) {
          d = x0 - d0.lap > d1.lap - x0 ? d1 : d0;
        } else if (d1) {
          d = d1;
        }

        if (!d) return;

        const cx = xScale(d.lap);
        const cy = yScale(d.gapSeconds);

        focusGroup.style('display', null);
        focusLine.attr('x1', cx).attr('x2', cx);
        focusCircle.attr('cx', cx).attr('cy', cy);

        setHoveredPoint(d);
        setTooltipPos({
          x: cx + margin.left,
          y: cy + margin.top
        });
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
        setTooltipPos(null);
      });
  }, [filteredData, activeEntry]);

  if (!snapshot.entries || snapshot.entries.length === 0) {
    return null;
  }

  return (
    <section
      className="border border-[#222933] text-neutral-300 mb-4 transition-all rounded overflow-hidden"
      aria-label="Lap Gap to Leader Telemetry Chart"
      style={{
        borderLeft: `4px solid ${activeEntry?.teamColor || 'var(--f1-red)'}`,
        background: `linear-gradient(180deg, ${activeEntry?.teamColor ? `${activeEntry.teamColor}12` : 'rgba(255,255,255,0.02)'} 0%, rgba(17, 20, 24, 0.95) 140px, #111418 100%)`,
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
      }}
    >
      {/* Header Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222933] px-4 py-3"
        style={{
          background: `linear-gradient(90deg, ${activeEntry?.teamColor ? `${activeEntry.teamColor}18` : 'rgba(255,255,255,0.03)'} 0%, #161a20 40%, #161a20 100%)`
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 inline-block"
            style={{ backgroundColor: activeEntry?.teamColor }}
          />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-neutral-400" />
            <span>GAP TO RACE LEADER</span>
            <span className="text-neutral-500 font-normal">·</span>
            <span className="text-neutral-400 font-normal">LAP-BY-LAP TELEMETRY</span>
          </h2>
        </div>

        {/* Action Controls & Driver Selector */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-neutral-500 text-[11px] uppercase font-semibold">DRIVER:</span>
            <select
              value={activeEntry?.driverNumber}
              onChange={e => handleSelectDriver(parseInt(e.target.value, 10))}
              className="bg-[#0e1115] border border-[#2d3748] text-white px-2 py-0.5 text-xs cursor-pointer focus:outline-none rounded"
              aria-label="Select driver to chart gap against race leader"
            >
              {snapshot.entries.map(e => (
                <option key={e.driverNumber} value={e.driverNumber}>
                  P{e.position} {e.driverCode} (#{e.driverNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Range Presets: All, Last 10, Last 20 */}
          {gapData.length > 10 && (
            <div className="flex items-center border border-[#2d3748] bg-[#0e1115] rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setRangeFilter('all')}
                className={`px-2 py-0.5 text-[11px] transition-colors ${
                  rangeFilter === 'all'
                    ? 'bg-[#252f3e] text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('20')}
                className={`px-2 py-0.5 text-[11px] transition-colors ${
                  rangeFilter === '20'
                    ? 'bg-[#252f3e] text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                20L
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('10')}
                className={`px-2 py-0.5 text-[11px] transition-colors ${
                  rangeFilter === '10'
                    ? 'bg-[#252f3e] text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                10L
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 border border-[#2d3748] bg-[#0e1115] hover:bg-[#1a202c] text-neutral-400 hover:text-white rounded"
            aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Quick Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-[#202732] text-xs">
              <div className="border border-[#263140] bg-gradient-to-b from-[#18202c] to-[#12161f] p-2.5 rounded shadow-sm">
                <div className="text-[11px] text-neutral-400 uppercase font-semibold">CURRENT GAP</div>
                <div className="text-sm font-bold text-white timing-cell mt-0.5">
                  {stats.isLeader ? (
                    <span className="text-white">P1 (LEADER)</span>
                  ) : (
                    stats.currentGap
                  )}
                </div>
              </div>

              <div className="border border-[#263140] bg-gradient-to-b from-[#18202c] to-[#12161f] p-2.5 rounded shadow-sm">
                <div className="text-[11px] text-neutral-400 uppercase font-semibold">RECENT TREND</div>
                <div className="text-sm font-bold timing-cell mt-0.5 flex items-center gap-1.5">
                  {stats.recentTrend === 'gaining' ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">
                        CLOSING ({stats.avgDeltaPerLap.toFixed(3)}s)
                      </span>
                    </>
                  ) : stats.recentTrend === 'losing' ? (
                    <>
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-rose-400">
                        OPENING (+{stats.avgDeltaPerLap.toFixed(3)}s)
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-300">STABLE PACE</span>
                  )}
                </div>
              </div>

              <div className="border border-[#263140] bg-gradient-to-b from-[#18202c] to-[#12161f] p-2.5 rounded shadow-sm">
                <div className="text-[11px] text-neutral-400 uppercase font-semibold">MIN / MAX GAP</div>
                <div className="text-sm font-bold text-neutral-200 timing-cell mt-0.5">
                  +{stats.minGap.toFixed(2)}s / +{stats.maxGap.toFixed(2)}s
                </div>
              </div>

              <div className="border border-[#263140] bg-gradient-to-b from-[#18202c] to-[#12161f] p-2.5 rounded shadow-sm">
                <div className="text-[11px] text-neutral-400 uppercase font-semibold">DRS ATTACK LAPS</div>
                <div className="text-sm font-bold text-neutral-200 timing-cell mt-0.5">
                  {stats.lapsInDrs} LAP{stats.lapsInDrs !== 1 ? 'S' : ''} &le; 1.0s
                </div>
              </div>
            </div>
          )}

          {/* D3 SVG Container with Relative Hover Tooltip */}
          <div ref={containerRef} className="relative w-full bg-gradient-to-b from-[#0e131b] to-[#080b0f] border border-[#232c3a] p-2 rounded shadow-inner">
            <svg ref={svgRef} className="w-full block" />

            {/* Interactive Dynamic Floating Tooltip */}
            {hoveredPoint && tooltipPos && (
              <div
                className="absolute z-20 pointer-events-none bg-[#161c24] border border-[#2e3b4e] p-2.5 shadow-lg text-xs font-sans text-neutral-200 rounded"
                style={{
                  left: `${Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 700) - 170)}px`,
                  top: `${Math.max(10, tooltipPos.y - 85)}px`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#2a3648] pb-1 mb-1 text-[11px]">
                  <span className="font-bold text-white">LAP {hoveredPoint.lap}</span>
                  <span className="text-neutral-400">P{hoveredPoint.driverPosition}</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-400">Gap to Leader:</span>
                    <strong
                      className={`timing-cell ${
                        hoveredPoint.isLeader ? 'text-white' : 'text-neutral-100'
                      }`}
                    >
                      {hoveredPoint.formattedGap}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-400">Leader:</span>
                    <span className="text-neutral-200">{hoveredPoint.leaderCode}</span>
                  </div>

                  {hoveredPoint.deltaToPrevLap != null && (
                    <div className="flex justify-between gap-3">
                      <span className="text-neutral-400">Lap Delta:</span>
                      <span
                        className={`timing-cell font-semibold ${
                          hoveredPoint.deltaToPrevLap < 0
                            ? 'text-emerald-400'
                            : hoveredPoint.deltaToPrevLap > 0
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {hoveredPoint.deltaToPrevLap < 0
                          ? `Gaining ${Math.abs(hoveredPoint.deltaToPrevLap).toFixed(3)}s`
                          : `Losing +${hoveredPoint.deltaToPrevLap.toFixed(3)}s`}
                      </span>
                    </div>
                  )}

                  {hoveredPoint.isPitLap && (
                    <div className="text-[11px] text-neutral-400 font-semibold pt-1 flex items-center gap-1 border-t border-[#252f3f] mt-1">
                      <Wrench className="w-3 h-3 text-neutral-400" />
                      <span>PIT STOP RECORDED</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Guide / Legend Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-0.5 inline-block"
                  style={{ backgroundColor: activeEntry?.teamColor || '#e10600' }}
                />
                <span>Time Deficit (s)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-500 inline-block border-t border-dashed" />
                <span>1.0s DRS Window</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500 inline-block" />
                <span>Pit Stop</span>
              </span>
            </div>

            <div className="text-neutral-400">
              Hover along telemetry line to inspect lap-by-lap interval delta
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
