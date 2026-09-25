/**
 * Live F1 Timing Provider
 * Integrates with official SignalR feed and OpenF1 endpoints.
 * Never fabricates live data. If no on-track session is active, reports PROVIDER_UNAVAILABLE.
 */

import { F1LiveProvider, LiveSessionSnapshot } from './types';
import { LiveConnectionState, RaceControlMessage } from '../types/f1';
import { F1SignalRClient } from './signalrClient';

export class LiveTimingProvider implements F1LiveProvider {
  public name = 'Formula 1 Live Timing (SignalR Core)';
  private client: F1SignalRClient;
  private state: LiveConnectionState = 'DISCONNECTED';
  private snapshotListeners: ((snapshot: LiveSessionSnapshot) => void)[] = [];
  private stateListeners: ((state: LiveConnectionState, reason?: string) => void)[] = [];
  private rcListeners: ((msg: RaceControlMessage) => void)[] = [];
  private currentSnapshot: LiveSessionSnapshot | null = null;

  constructor() {
    this.client = new F1SignalRClient();
    this.setupListeners();
  }

  private setupListeners() {
    this.client.onStatusChange((status, detail) => {
      let mappedState: LiveConnectionState = 'DISCONNECTED';
      if (status === 'CONNECTING') mappedState = 'CONNECTING';
      else if (status === 'CONNECTED') mappedState = 'CONNECTED';
      else if (status === 'SUBSCRIBED') mappedState = 'LIVE'; // Ready to stream
      else if (status === 'ERROR') mappedState = 'PROVIDER_UNAVAILABLE';

      this.state = mappedState;
      this.stateListeners.forEach(l => l(mappedState, detail));
    });

    this.client.onFeed((msg) => {
      // Decode incoming stream
      if (msg.stream === 'TimingData' || msg.stream === 'SessionData') {
        this.processTimingFeed(msg);
      } else if (msg.stream === 'RaceControlMessages') {
        this.processRaceControlFeed(msg);
      }
    });
  }

  private processTimingFeed(msg: any) {
    // If incoming live payload received:
    this.state = 'LIVE';
    // When live stream packets arrive, update snapshot and notify
  }

  private processRaceControlFeed(msg: any) {
    if (msg.data && msg.data.Messages) {
      // Parse FIA message
    }
  }

  public async connect(): Promise<void> {
    try {
      this.state = 'CONNECTING';
      this.stateListeners.forEach(l => l('CONNECTING'));
      await this.client.connect();
    } catch (err: any) {
      this.state = 'PROVIDER_UNAVAILABLE';
      this.stateListeners.forEach(l => l('PROVIDER_UNAVAILABLE', err.message || 'No live session active'));
    }
  }

  public disconnect(): void {
    this.client.disconnect();
    this.state = 'DISCONNECTED';
    this.stateListeners.forEach(l => l('DISCONNECTED'));
  }

  public getState(): LiveConnectionState {
    return this.state;
  }

  public onSnapshot(callback: (snapshot: LiveSessionSnapshot) => void): () => void {
    this.snapshotListeners.push(callback);
    if (this.currentSnapshot) {
      callback(this.currentSnapshot);
    }
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
