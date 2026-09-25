/**
 * Formula 1 SignalR Core Protocol Client
 * Handles connection, handshake, subscription, and decoding of the F1 'feed' protocol.
 */

export interface SignalRFeedMessage {
  stream: string;
  data: any;
  timestamp: string;
}

export type SignalRStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SUBSCRIBED' | 'ERROR';

export class F1SignalRClient {
  private ws: WebSocket | null = null;
  private url: string;
  private status: SignalRStatus = 'DISCONNECTED';
  private statusListeners: ((status: SignalRStatus, detail?: string) => void)[] = [];
  private feedListeners: ((msg: SignalRFeedMessage) => void)[] = [];
  private invocationCounter = 1;
  private pingInterval: any = null;

  constructor(url = 'wss://livetiming.formula1.com/signalrcore') {
    this.url = url;
  }

  public getStatus(): SignalRStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: SignalRStatus, detail?: string) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public onFeed(listener: (msg: SignalRFeedMessage) => void): () => void {
    this.feedListeners.push(listener);
    return () => {
      this.feedListeners = this.feedListeners.filter(l => l !== listener);
    };
  }

  private setStatus(status: SignalRStatus, detail?: string) {
    this.status = status;
    this.statusListeners.forEach(l => l(status, detail));
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return resolve();
      }

      this.setStatus('CONNECTING');

      try {
        this.ws = new WebSocket(this.url);

        const timeout = setTimeout(() => {
          if (this.status === 'CONNECTING') {
            this.disconnect();
            this.setStatus('ERROR', 'Connection timed out (no live on-track session)');
            reject(new Error('Connection timed out'));
          }
        }, 12000);

        this.ws.onopen = () => {
          // Step 1: Send SignalR JSON protocol handshake
          // SignalR core protocol messages end with Record Separator ASCII 0x1E (\u001e)
          const handshake = JSON.stringify({ protocol: 'json', version: 1 }) + '\u001e';
          this.ws?.send(handshake);
        };

        this.ws.onmessage = (event) => {
          clearTimeout(timeout);
          const raw = typeof event.data === 'string' ? event.data : '';
          // SignalR messages can be batched with \u001e delimiter
          const parts = raw.split('\u001e').filter(p => p.trim().length > 0);

          for (const part of parts) {
            try {
              const msg = JSON.parse(part);

              // Handshake response is empty object {}
              if (Object.keys(msg).length === 0) {
                this.setStatus('CONNECTED');
                this.startPing();
                this.subscribeToFeeds();
                resolve();
                continue;
              }

              // SignalR Message Types:
              // 1: Invocation (e.g. server invokes client method 'feed')
              // 6: Ping
              // 3: Completion
              if (msg.type === 6) {
                // Heartbeat ping from server -> respond with ping
                this.ws?.send(JSON.stringify({ type: 6 }) + '\u001e');
                continue;
              }

              if (msg.type === 1) {
                // CRITICAL FIX: The F1 SignalR server invokes 'feed' method on client
                // Target is 'feed', arguments are [streamName, dataPayload, timestamp]
                if (msg.target === 'feed' && Array.isArray(msg.arguments)) {
                  const [stream, data, timestamp] = msg.arguments;
                  this.feedListeners.forEach(listener => {
                    listener({
                      stream,
                      data,
                      timestamp: timestamp || new Date().toISOString()
                    });
                  });
                }
              }
            } catch (err) {
              // Ignore non-json or fragmented frames
            }
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(timeout);
          this.setStatus('ERROR', 'WebSocket error (live server unavailable or CORS restricted)');
          reject(err);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.clearIntervals();
          this.setStatus('DISCONNECTED', `Socket closed (code ${event.code})`);
        };
      } catch (err: any) {
        this.setStatus('ERROR', err.message || 'Failed to initialize socket');
        reject(err);
      }
    });
  }

  private subscribeToFeeds() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // F1 SignalR hubs accept a 'Subscribe' invocation with streams:
    const streams = [
      'Heartbeat',
      'TrackStatus',
      'TimingData',
      'TimingAppData',
      'WeatherData',
      'RaceControlMessages',
      'SessionData',
      'DriverList',
      'LapCount'
    ];

    const subscribeMsg = JSON.stringify({
      type: 1,
      invocationId: String(this.invocationCounter++),
      target: 'Subscribe',
      arguments: [streams]
    }) + '\u001e';

    this.ws.send(subscribeMsg);
    this.setStatus('SUBSCRIBED');
  }

  private startPing() {
    this.clearIntervals();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 6 }) + '\u001e');
      }
    }, 15000);
  }

  private clearIntervals() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.clearIntervals();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }
}
