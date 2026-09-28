import { useEffect, useRef, useState } from 'react';
import { ReplayProvider } from '../providers/replayProvider';
import { LiveTimingProvider } from '../providers/liveTimingProvider';
import { GrandPrix, LiveConnectionState, LiveSessionSnapshot, SessionSchedule, LapTelemetry } from '../types/f1';

export function useLiveSession(activeLiveSession: { gp: GrandPrix; session: SessionSchedule } | null) {
  const replayRef = useRef<ReplayProvider | null>(null);
  const liveRef = useRef<LiveTimingProvider | null>(null);
  if (!replayRef.current) replayRef.current = new ReplayProvider();
  if (!liveRef.current) liveRef.current = new LiveTimingProvider();
  const replayEngine = replayRef.current;
  const liveEngine = liveRef.current;

  const [isReplayMode, setIsReplayMode] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(() => replayEngine.getSnapshot());
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('REPLAY');
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    let unsubSnapshot = () => {};
    let unsubState = () => {};
    setProviderError(null);
    if (isReplayMode) {
      unsubSnapshot = replayEngine.onSnapshot(setSnapshot);
      unsubState = replayEngine.onStateChange(setConnectionState);
      void replayEngine.connect().catch((error: unknown) => {
        setConnectionState('PROVIDER_UNAVAILABLE');
        setProviderError(error instanceof Error ? error.message : 'Unable to load the recorded replay.');
      });
    } else {
      unsubSnapshot = liveEngine.onSnapshot(setSnapshot);
      unsubState = liveEngine.onStateChange(setConnectionState);
      if (activeLiveSession) {
        void liveEngine.connect().catch((error: unknown) => {
          setConnectionState('PROVIDER_UNAVAILABLE');
          setProviderError(error instanceof Error ? error.message : 'Live timing requires the local proxy.');
        });
      } else {
        liveEngine.disconnect();
        setConnectionState('DISCONNECTED');
      }
    }
    return () => { unsubSnapshot(); unsubState(); };
  }, [isReplayMode, replayEngine, liveEngine, activeLiveSession]);

  const switchToReplay = () => {
    liveEngine.disconnect(); replayEngine.pause(); setIsReplayPlaying(false); setIsReplayMode(true);
    setSnapshot(replayEngine.getSnapshot()); setConnectionState('REPLAY');
    void replayEngine.connect().catch((error: unknown) => {
      setConnectionState('PROVIDER_UNAVAILABLE');
      setProviderError(error instanceof Error ? error.message : 'Unable to load the recorded replay.');
    });
  };

  const handleReplayRace = async (gp: GrandPrix) => {
    const raceSession = gp.sessions.find(session => session.type === 'RACE');
    if (!raceSession) throw new Error('Race session is unavailable for this weekend.');
    liveEngine.disconnect(); replayEngine.pause(); setIsReplayPlaying(false);
    try { await replayEngine.loadRace(gp, raceSession); }
    catch (error: unknown) {
      setProviderError(error instanceof Error ? error.message : 'Unable to load the selected replay.');
      setConnectionState('PROVIDER_UNAVAILABLE'); return;
    }
    setProviderError(null); setIsReplayMode(true); setConnectionState('REPLAY'); setSnapshot(replayEngine.getSnapshot());
  };

  const toggleProviderMode = () => {
    if (isReplayMode) {
      replayEngine.pause(); setIsReplayPlaying(false); setIsReplayMode(false);
      if (activeLiveSession) void liveEngine.connect(); else setConnectionState('DISCONNECTED');
    } else switchToReplay();
  };

  const getCompletedLaps = (upToLap?: number): LapTelemetry[] => {
    return replayEngine.getCompletedLaps(upToLap);
  };

  return { snapshot, connectionState, isReplayMode, isReplayPlaying, replaySpeed, providerError, replayEngine, liveEngine, setIsReplayPlaying, setReplaySpeed, switchToReplay, handleReplayRace, toggleProviderMode, getCompletedLaps };
}
