/**
 * Live F1 Timing Provider
 * Integrates with official SignalR feed and normalizes incoming telemetry.
 *
 * TRUTHFUL STATE MACHINE:
 * - DISCONNECTED: Socket closed or not initiated.
 * - CONNECTING: Handshake in progress.
 * - CONNECTED: Handshake completed.
 * - SUBSCRIBED: Streams requested, waiting for actual payload.
 * - LIVE: Real timing data packets received and parsed within STALE_TIMEOUT_MS.
 * - STALE: No live packet received for > STALE_TIMEOUT_MS.
 * - PROVIDER_UNAVAILABLE: WebSocket unreachable / connection rejected / no session active.
 * - ERROR: Socket error occurred.
 */

import { F1LiveProvider } from '../types';
import { LiveSessionSnapshot, LiveConnectionState, RaceControlMessage } from '../../types/f1';
import { F1SignalRClient } from '../signalrClient';
import { LiveSessionStateStore } from './normalizers/liveSessionStateStore';
import { parseTrackStatus } from './parsers/trackStatusParser';
import { parseWeatherData } from './parsers/weatherParser';
import { parseRaceControlMessages } from './parsers/raceControlParser';
import { parseDriverList } from './parsers/driverListParser';
import { parseTimingData, parseTimingAppData } from './parsers/timingDataParser';
import { parseSessionData, parseLapCount } from './parsers/sessionParser';

export class LiveTimingProvider implements F1LiveProvider {
  public name = 'Formula 1 Live Timing (SignalR Core)';
  private client: F1SignalRClient;
  private state: LiveConnectionState = 'DISCONNECTED';
  private stateStore = new LiveSessionStateStore();

  private snapshotListeners: ((snapshot: LiveSessionSnapshot) => void)[] = [];
  private stateListeners: ((state: LiveConnectionState, reason?: string) => void)[] = [];
  private rcListeners: ((msg: RaceControlMessage) => void)[] = [];

  private lastPacketTimestamp: number | null = null;
  private staleCheckTimer: any = null;
  private STALE_TIMEOUT_MS = 25000; // 25 seconds without packet = STALE
  private hasReceivedRealTimingData = false;

  constructor() {
    this.client = new F1SignalRClient();
    this.setupListeners();
  }

  private setupListeners() {
    this.client.onStatusChange((status, detail) => {
      let mappedState: LiveConnectionState = 'DISCONNECTED';
      if (status === 'CONNECTING') mappedState = 'CONNECTING';
      else if (status === 'CONNECTED') mappedState = 'CONNECTED';
      else if (status === 'SUBSCRIBED') {
        // Subscribed, but NOT yet LIVE until actual timing packets arrive!
        mappedState = this.hasReceivedRealTimingData ? 'LIVE' : 'SUBSCRIBED';
      }
      else if (status === 'ERROR') mappedState = 'PROVIDER_UNAVAILABLE';

      this.setState(mappedState, detail);
    });

    this.client.onFeed((msg) => {
      this.handleIncomingFeed(msg);
    });
  }

  private setState(newState: LiveConnectionState, reason?: string) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateStore.setConnectionState(newState, reason);
    this.stateListeners.forEach(l => l(newState, reason));
    this.broadcastSnapshot();
  }

  private broadcastSnapshot() {
    const snap = this.stateStore.getSnapshot();
    this.snapshotListeners.forEach(l => l(snap));
  }

  private handleIncomingFeed(msg: { stream: string; data: any; timestamp: string }) {
    this.lastPacketTimestamp = Date.now();

    const { stream, data } = msg;
    if (!data) return;

    let hasTimingUpdate = false;

    switch (stream) {
      case 'TimingData': {
        const updates = parseTimingData(data);
        if (updates.length > 0) {
          this.stateStore.mergeTimingData(updates);
          hasTimingUpdate = true;
          this.hasReceivedRealTimingData = true;
        }
        break;
      }
      case 'TimingAppData': {
        const appMap = parseTimingAppData(data);
        if (appMap.size > 0) {
          this.stateStore.mergeTimingAppData(appMap);
          hasTimingUpdate = true;
        }
        break;
      }
      case 'TrackStatus': {
        const status = parseTrackStatus(data);
        if (status) {
          this.stateStore.mergeTrackStatus(status);
        }
        break;
      }
      case 'WeatherData': {
        const weather = parseWeatherData(data);
        if (weather) {
          this.stateStore.mergeWeather(weather);
        }
        break;
      }
      case 'RaceControlMessages': {
        const messages = parseRaceControlMessages(data);
        if (messages.length > 0) {
          this.stateStore.mergeRaceControlMessages(messages);
          messages.forEach(m => this.rcListeners.forEach(l => l(m)));
        }
        break;
      }
      case 'DriverList': {
        const drivers = parseDriverList(data);
        if (drivers.size > 0) {
          this.stateStore.mergeDriversList(drivers);
        }
        break;
      }
      case 'SessionData': {
        const info = parseSessionData(data);
        this.stateStore.mergeSessionInfo(info);
        break;
      }
      case 'LapCount': {
        const lapInfo = parseLapCount(data);
        this.stateStore.mergeSessionInfo(lapInfo);
        break;
      }
      case 'Heartbeat': {
        // Heartbeat keeps connection alive, but doesn't signify live timing by itself
        break;
      }
    }

    // Only switch to LIVE if genuine timing packets have actually arrived
    if (this.hasReceivedRealTimingData && (this.state === 'SUBSCRIBED' || this.state === 'CONNECTED' || this.state === 'STALE')) {
      this.setState('LIVE', 'Receiving active timing stream');
    }

    this.broadcastSnapshot();
  }

  private startStaleDetector() {
    this.stopStaleDetector();
    this.staleCheckTimer = setInterval(() => {
      if (this.state === 'LIVE' && this.lastPacketTimestamp) {
        const elapsed = Date.now() - this.lastPacketTimestamp;
        if (elapsed > this.STALE_TIMEOUT_MS) {
          this.setState('STALE', `No timing packet received for ${Math.round(elapsed / 1000)}s`);
        }
      }
    }, 5000);
  }

  private stopStaleDetector() {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  public async connect(): Promise<void> {
    try {
      this.hasReceivedRealTimingData = false;
      this.setState('CONNECTING');
      this.startStaleDetector();
      await this.client.connect();
    } catch (err: any) {
      this.setState('PROVIDER_UNAVAILABLE', err.message || 'No live session active or connection refused');
    }
  }

  public disconnect(): void {
    this.stopStaleDetector();
    this.client.disconnect();
    this.setState('DISCONNECTED');
  }

  public getState(): LiveConnectionState {
    return this.state;
  }

  public getLastUpdated(): string | null {
    return this.lastPacketTimestamp ? new Date(this.lastPacketTimestamp).toISOString() : null;
  }

  public onSnapshot(callback: (snapshot: LiveSessionSnapshot) => void): () => void {
    this.snapshotListeners.push(callback);
    callback(this.stateStore.getSnapshot());
    return () => {
      this.snapshotListeners = this.snapshotListeners.filter(l => l !== callback);
    };
  }

  public onStateChange(callback: (state: LiveConnectionState, reason?: string) => void): () => void {
    this.stateListeners.push(callback);
    callback(this.state);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== callback);
    };
  }

  public onRaceControlMessage(callback: (msg: RaceControlMessage) => void): () => void {
    this.rcListeners.push(callback);
    return () => {
      this.rcListeners = this.rcListeners.filter(l => l !== callback);
    };
  }
}
