import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JolpicaProvider } from '../providers/jolpicaProvider';
import { OpenF1Provider } from '../providers/openF1Provider';
import { F1EnrichmentProvider } from '../providers/f1EnrichmentProvider';
import { getSeasonChassis } from '../config/season';
import { Circuit, ConstructorStanding, DataProvenance, Driver, DriverStanding, GrandPrix, NewsItem, SessionDetail, SessionSchedule, Team, TechnicalUpdate, FIADocument } from '../types/f1';

export function useSeasonData(selectedSeason: number) {
  const jolpicaProvider = useMemo(() => new JolpicaProvider(), []);
  const openF1Provider = useMemo(() => new OpenF1Provider(), []);
  const enrichmentProvider = useMemo(() => new F1EnrichmentProvider(), []);
  const [schedule, setSchedule] = useState<GrandPrix[]>([]), [scheduleProvenance, setScheduleProvenance] = useState<DataProvenance>(), [scheduleError, setScheduleError] = useState<string | null>(null);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]), [standingsProvenance, setStandingsProvenance] = useState<DataProvenance>(), [standingsError, setStandingsError] = useState<string | null>(null);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]), [drivers, setDrivers] = useState<Driver[]>([]), [teams, setTeams] = useState<Team[]>([]), [circuits, setCircuits] = useState<Circuit[]>([]);
  const headshotsRef = useRef<Record<string, string>>({});
  const driverStandingsRef = useRef<DriverStanding[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]), [technicalUpdates, setTechnicalUpdates] = useState<TechnicalUpdate[]>([]), [fiaDocuments, setFiaDocuments] = useState<FIADocument[]>([]), [isLoadingSeason, setIsLoadingSeason] = useState(true);

  const decorateDrivers = useCallback((rows: DriverStanding[], headshots: Record<string, string>) => rows.map(({ driver }) => ({ ...driver, headshotUrl: headshots[String(driver.number)] ?? headshots[driver.code], countryCode: driver.nationality, chassis: getSeasonChassis(selectedSeason, driver.teamId) })), [selectedSeason]);
  const decorateTeams = useCallback((rows: ConstructorStanding[], driverRows: DriverStanding[]) => {
    const codes = new Map<string, string[]>();
    for (const row of driverRows) codes.set(row.driver.teamId, [...(codes.get(row.driver.teamId) ?? []), row.driver.code]);
    return rows.map(({ team }) => ({ ...team, chassis: getSeasonChassis(selectedSeason, team.id), drivers: codes.get(team.id) ?? [] }));
  }, [selectedSeason]);

  const applyCore = useCallback((core: { schedRes: Awaited<ReturnType<JolpicaProvider['getSchedule']>>; dStandingsRes: Awaited<ReturnType<JolpicaProvider['getDriverStandings']>>; cStandingsRes: Awaited<ReturnType<JolpicaProvider['getConstructorStandings']>> }, headshots: Record<string, string>) => {
    const { schedRes, dStandingsRes, cStandingsRes } = core;
    if (Object.keys(headshots).length > 0) headshotsRef.current = { ...headshotsRef.current, ...headshots };
    if (schedRes.status === 'SUCCESS') { setSchedule(schedRes.data); setScheduleProvenance(schedRes.provenance); setScheduleError(null); }
    else { setScheduleProvenance(schedRes.provenance); setScheduleError(schedRes.status === 'EMPTY' ? schedRes.message : schedRes.error); }
    if (dStandingsRes.status === 'SUCCESS') { driverStandingsRef.current = dStandingsRes.data; setDriverStandings(dStandingsRes.data); setDrivers(decorateDrivers(dStandingsRes.data, headshotsRef.current)); setStandingsProvenance(dStandingsRes.provenance); setStandingsError(null); }
    else { setStandingsProvenance(dStandingsRes.provenance); setStandingsError(dStandingsRes.status === 'EMPTY' ? dStandingsRes.message : dStandingsRes.error); }
    if (cStandingsRes.status === 'SUCCESS') { setConstructorStandings(cStandingsRes.data); setTeams(decorateTeams(cStandingsRes.data, dStandingsRes.status === 'SUCCESS' ? dStandingsRes.data : driverStandingsRef.current)); }
  }, [decorateDrivers, decorateTeams]);

  const refreshCore = useCallback(() => Promise.all([jolpicaProvider.getSchedule(selectedSeason), jolpicaProvider.getDriverStandings(selectedSeason), jolpicaProvider.getConstructorStandings(selectedSeason)]).then(([schedRes, dStandingsRes, cStandingsRes]) => ({ schedRes, dStandingsRes, cStandingsRes })), [jolpicaProvider, selectedSeason]);

  useEffect(() => {
    let active = true;
    setIsLoadingSeason(true); setScheduleError(null); setStandingsError(null);
    const load = async () => {
      try {
        const [core, circsRes, headshotsRaw, circuitMetaRaw, fiaNews, technical, fiaDocs] = await Promise.all([
          refreshCore(), jolpicaProvider.getCircuits(selectedSeason), openF1Provider.getSeasonDriverImages(selectedSeason).catch(() => ({})), enrichmentProvider.getSeasonCircuitEnrichment(selectedSeason).catch(() => ({})), enrichmentProvider.getFiaNews().catch(() => []), enrichmentProvider.getTechnicalUpdates().catch(() => []), enrichmentProvider.getFiaDocuments().catch(() => [])
        ]);
        if (!active) return;
        const headshots = headshotsRaw as Record<string, string>, meta = circuitMetaRaw as Record<string, Partial<Circuit>>;
        if (circsRes.status === 'SUCCESS') setCircuits(circsRes.data.map(c => ({ ...c, ...(meta[c.country.toLowerCase()] ?? {}), ...(meta[c.name.toLowerCase()] ?? {}), ...(meta[c.location.toLowerCase()] ?? {}) })));
        setNews(fiaNews); setTechnicalUpdates(technical); setFiaDocuments(fiaDocs); applyCore(core, headshots);
      } catch (error: unknown) {
        if (active) { const message = error instanceof Error ? error.message : 'Unable to load season data.'; setScheduleError(message); setStandingsError(message); }
      } finally { if (active) setIsLoadingSeason(false); }
    };
    void load(); return () => { active = false; };
  }, [selectedSeason, refreshCore, jolpicaProvider, openF1Provider, enrichmentProvider, applyCore]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try { const core = await refreshCore(); if (active) applyCore(core, headshotsRef.current); } catch { /* retain last good data */ }
    };
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    const visibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [refreshCore, applyCore]);

  const activeLiveSession = useMemo(() => {
    for (const gp of schedule) { const session = gp.sessions.find(item => item.status === 'LIVE'); if (session) return { gp, session }; }
    return null;
  }, [schedule]);

  const loadSession = useCallback(async (gp: GrandPrix, session: SessionSchedule): Promise<SessionDetail> => {
    try {
      const detail = await openF1Provider.getSessionDetail(gp, session);
      if (!detail.startTime) detail.startTime = session.startTime;
      if (!detail.endTime) detail.endTime = new Date(new Date(session.startTime).getTime() + (session.type === 'RACE' ? 120 : 60) * 60_000).toISOString();
      return detail;
    } catch (openF1Error) {
      if (session.type === 'RACE' || session.type === 'QUALIFYING' || session.type === 'SPRINT') {
        const fallback = await jolpicaProvider.getRaceWeekendData(gp.season, gp.round);
        if (fallback.status === 'SUCCESS') {
          const detail = jolpicaProvider.toSessionDetail(fallback.data, session);
          detail.startTime = session.startTime; detail.endTime = new Date(new Date(session.startTime).getTime() + (session.type === 'RACE' ? 120 : 60) * 60_000).toISOString(); return detail;
        }
      }
      throw openF1Error;
    }
  }, [jolpicaProvider, openF1Provider]);

  return { jolpicaProvider, openF1Provider, schedule, scheduleProvenance, scheduleError, driverStandings, standingsProvenance, standingsError, constructorStandings, drivers, teams, circuits, news, technicalUpdates, fiaDocuments, isLoadingSeason, activeLiveSession, loadSession };
}
