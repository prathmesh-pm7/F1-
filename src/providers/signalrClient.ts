/** Browser-side transport for the local Formula 1 SignalR proxy. */

export interface SignalRFeedMessage { stream: string; data: any; timestamp: string; }
export type SignalRStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SUBSCRIBED' | 'ERROR';

export class F1SignalRClient {
  private source: EventSource | null = null;
  private status: SignalRStatus = 'DISCONNECTED';
  private statusListeners: ((status: SignalRStatus, detail?: string) => void)[] = [];
  private feedListeners: ((msg: SignalRFeedMessage) => void)[] = [];
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private intentionalDisconnect = false;
  private maxReconnectAttempts = 8;
  private url: string;

  constructor(url = '/api/live-timing') { this.url = url; }
  public getStatus(): SignalRStatus { return this.status; }
  public onStatusChange(listener: (status: SignalRStatus, detail?: string) => void): () => void { this.statusListeners.push(listener); return () => { this.statusListeners = this.statusListeners.filter(l => l !== listener); }; }
  public onFeed(listener: (msg: SignalRFeedMessage) => void): () => void { this.feedListeners.push(listener); return () => { this.feedListeners = this.feedListeners.filter(l => l !== listener); }; }
  private setStatus(status: SignalRStatus, detail?: string) { this.status = status; this.statusListeners.forEach(listener => listener(status, detail)); }

  public connect(): Promise<void> {
    if (this.source && this.status !== 'ERROR' && this.status !== 'DISCONNECTED') return Promise.resolve();
    this.intentionalDisconnect = false; this.setStatus('CONNECTING');
    return new Promise((resolve, reject) => {
      const source = new EventSource(this.url); this.source = source; let settled = false;
      source.onopen = () => { this.reconnectAttempts = 0; this.setStatus('SUBSCRIBED', 'Connected through the local F1 timing proxy'); if (!settled) { settled = true; resolve(); } };
      source.addEventListener('feed', event => {
        try { const msg = JSON.parse((event as MessageEvent<string>).data) as SignalRFeedMessage; if (msg?.stream) this.feedListeners.forEach(listener => listener(msg)); } catch { /* ignore malformed relay frames */ }
      });
      source.onerror = () => {
        source.close(); this.source = null; this.setStatus('ERROR', 'Live timing proxy unavailable');
        if (!settled) { settled = true; reject(new Error('Live timing requires the local proxy.')); }
        if (!this.intentionalDisconnect) this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect() {
    if (this.intentionalDisconnect || this.reconnectTimer !== null || this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts)); this.reconnectAttempts += 1;
    this.setStatus('CONNECTING', 'Reconnecting in ' + Math.round(delay / 1000) + 's (attempt ' + this.reconnectAttempts + '/' + this.maxReconnectAttempts + ')');
    this.reconnectTimer = window.setTimeout(() => { this.reconnectTimer = null; void this.connect().catch(() => undefined); }, delay);
  }

  public reconnect(): void { this.disconnect(); this.intentionalDisconnect = false; void this.connect().catch(() => undefined); }
  public disconnect() { this.intentionalDisconnect = true; this.reconnectAttempts = 0; if (this.reconnectTimer !== null) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; } this.source?.close(); this.source = null; this.setStatus('DISCONNECTED'); }
}
