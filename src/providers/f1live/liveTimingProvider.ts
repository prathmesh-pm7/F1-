/**
 * Live F1 Timing Provider
 * Integrates with official SignalR feed and normalizes incoming telemetry.
 *
 * The UI is deliberately truthful: a connected browser transport is not treated
 * as a live F1 session until actual timing packets have arrived.
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
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private readonly STALE_TIMEOUT_MS = 25000;
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
        mappedState = this.hasReceivedRealTimingData ? 'LIVE' : 'SUBSCRIBED';
      } else if (status === 'ERROR') {
        mappedState = 'PROVIDER_UNAVAILABLE';
      }

      this.setState(mappedState, detail);
    });

    this.client.onFeed(msg => this.handleIncomingFeed(msg));
  }

  private setState(newState: LiveConnectionState, reason?: string) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateStore.setConnectionState(newState, reason);
    this.stateListeners.forEach(listener => listener(newState, reason));
    this.broadcastSnapshot();
  }

  private broadcastSnapshot() {
    const snapshot = this.stateStore.getSnapshot();
    this.snapshotListeners.forEach(listener => listener(snapshot));
  }

  private handleIncomingFeed(msg: { stream: string; data: any; timestamp: string }) {
    const { stream, data } = msg;
    if (!data) return;

    switch (stream) {
      case 'TimingData': {
        const updates = parseTimingData(data);
        if (updates.length > 0) {
          this.stateStore.mergeTimingData(updates);
          this.hasReceivedRealTimingData = true;
          this.lastPacketTimestamp = Date.now();
        }
        break;
      }
      case 'TimingAppData': {
        const appMap = parseTimingAppData(data);
        if (appMap.size > 0) this.stateStore.mergeTimingAppData(appMap);
        break;
      }
      case 'TrackStatus': {
        const status = parseTrackStatus(data, msg.timestamp);
        if (status) this.stateStore.mergeTrackStatus(status);
        break;
      }
      case 'WeatherData': {
        const weather = parseWeatherData(data);
        if (weather) this.stateStore.mergeWeather(weather);
        break;
      }
      case 'RaceControlMessages': {
        const messages = parseRaceControlMessages(data);
        if (messages.length > 0) {
          this.stateStore.mergeRaceControlMessages(messages);
          messages.forEach(message => this.rcListeners.forEach(listener => listener(message)));
        }
        break;
      }
      case 'DriverList': {
        const drivers = parseDriverList(data);
        if (drivers.size > 0) this.stateStore.mergeDriversList(drivers);
        break;
      }
      case 'SessionData': {
        this.stateStore.mergeSessionInfo(parseSessionData(data));
        break;
      }
      case 'LapCount': {
        this.stateStore.mergeSessionInfo(parseLapCount(data));
        break;
      }
      case 'Heartbeat':
        break;
    }

    if (
      this.hasReceivedRealTimingData &&
      (this.state === 'SUBSCRIBED' || this.state === 'CONNECTED' || this.state === 'STALE')
    ) {
      this.setState('LIVE', 'Receiving active timing stream');
    }

    this.broadcastSnapshot();
  }

  private startStaleDetector() {
    this.stopStaleDetector();
    this.staleCheckTimer = setInterval(() => {
      if (this.state !== 'LIVE' || !this.lastPacketTimestamp) return;

      const elapsed = Date.now() - this.lastPacketTimestamp;
      if (elapsed > this.STALE_TIMEOUT_MS) {
        this.setState('STALE', `No timing packet received for ${Math.round(elapsed / 1000)}s`);
        this.client.reconnect();
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
      this.lastPacketTimestamp = null;
      this.stateStore.reset();
      this.setState('CONNECTING');
      this.startStaleDetector();
      await this.client.connect();
    } catch (error: unknown) {
      this.setState(
        'PROVIDER_UNAVAILABLE',
        error instanceof Error ? error.message : 'No live timing feed available'
      );
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
      this.snapshotListeners = this.snapshotListeners.filter(listener => listener !== callback);
    };
  }

  public onStateChange(callback: (state: LiveConnectionState, reason?: string) => void): () => void {
    this.stateListeners.push(callback);
    callback(this.state);
    return () => {
      this.stateListeners = this.stateListeners.filter(listener => listener !== callback);
    };
  }

  public onRaceControlMessage(callback: (msg: RaceControlMessage) => void): () => void {
    this.rcListeners.push(callback);
    return () => {
      this.rcListeners = this.rcListeners.filter(listener => listener !== callback);
    };
  }
}
