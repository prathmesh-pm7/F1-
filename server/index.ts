import express from 'express';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';

const PORT = Number(process.env.F1_PROXY_PORT ?? 8787);
const UPSTREAM_WS = 'wss://livetiming.formula1.com/signalrcore';
const NEGOTIATE_URL = 'https://livetiming.formula1.com/signalrcore/negotiate?negotiateVersion=1';
const TOPICS = ['Heartbeat','DriverList','ExtrapolatedClock','RaceControlMessages','SessionData','SessionInfo','SessionStatus','TeamRadio','TimingAppData','TimingStats','TrackStatus','WeatherData','Position.z','CarData.z','LapCount','TimingData','TopThree'] as const;

const app = express();
const httpServer = createServer(app);
const clients = new Set<express.Response>();
let upstream: WebSocket | null = null;
let upstreamState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempt = 0;
let lastMessageAt: string | null = null;
let lastError: string | null = null;

app.get('/api/health', (_req, res) => res.json({
  ok: upstreamState === 'CONNECTED',
  upstream: upstreamState,
  clients: clients.size,
  lastMessageAt,
  lastError
}));

app.get('/api/live-timing', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('event: status\\ndata: ' + JSON.stringify({ state: upstreamState, lastMessageAt, lastError }) + '\\n\\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function broadcast(event: string, payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of clients) {
    try {
      client.write(`event: ${event}\\ndata: ${data}\\n\\n`);
    } catch {
      clients.delete(client);
    }
  }
}

function setUpstreamState(state: typeof upstreamState, error?: string) {
  upstreamState = state;
  if (error) lastError = error;
  if (state === 'CONNECTED') lastError = null;
  broadcast('status', { state, lastMessageAt, lastError });
}

function broadcastFeed(payload: unknown) {
  broadcast('feed', payload);
}

async function getCookies(): Promise<string> {
  const headers = {
    Origin: 'https://www.formula1.com',
    Referer: 'https://www.formula1.com/',
    'User-Agent': 'Mozilla/5.0 F1-Pulse'
  };

  // F1's edge has changed between OPTIONS/GET responses over time. Try both
  // methods and keep every cookie returned by the negotiate endpoint.
  for (const method of ['OPTIONS', 'GET'] as const) {
    const response = await fetch(NEGOTIATE_URL, { method, headers });
    if (!response.ok) continue;

    const cookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

    if (cookies.length > 0) {
      return cookies.map(cookie => cookie.split(';', 1)[0]).join('; ');
    }
  }

  throw new Error('F1 negotiate did not return a session cookie');
}

function sendSignalR(message: unknown) {
  if (upstream?.readyState === WebSocket.OPEN) {
    upstream.send(JSON.stringify(message) + '\u001e');
  }
}

async function connectUpstream() {
  if (upstreamState === 'CONNECTING' || upstreamState === 'CONNECTED') return;

  setUpstreamState('CONNECTING');

  try {
    const cookie = await getCookies();
    const socket = new WebSocket(UPSTREAM_WS, {
      headers: {
        Cookie: cookie,
        Origin: 'https://www.formula1.com',
        Referer: 'https://www.formula1.com/',
        'User-Agent': 'Mozilla/5.0 F1-Pulse'
      }
    });

    upstream = socket;

    socket.on('open', () => {
      reconnectAttempt = 0;
      setUpstreamState('CONNECTED');
      sendSignalR({ protocol: 'json', version: 1 });
    });

    socket.on('message', raw => {
      lastMessageAt = new Date().toISOString();

      for (const part of String(raw).split('\u001e').filter(Boolean)) {
        try {
          const message = JSON.parse(part);

          // SignalR JSON protocol handshake response is an empty object.
          if (message && Object.keys(message).length === 0) {
            sendSignalR({
              type: 1,
              invocationId: 'f1-pulse-subscribe',
              target: 'Subscribe',
              arguments: [TOPICS]
            });
            broadcast('status', { state: 'CONNECTED', subscribed: true, lastMessageAt, lastError });
            continue;
          }

          if (message?.type === 6) {
            sendSignalR({ type: 6 });
            continue;
          }

          if (message?.type === 7) {
            broadcastFeed({
              stream: 'ProxyStatus',
              data: { error: message.error || 'F1 SignalR connection closed by upstream' },
              timestamp: new Date().toISOString()
            });
            continue;
          }

          if (message?.type === 1 && message.target === 'feed' && Array.isArray(message.arguments)) {
            const [stream, data, timestamp] = message.arguments;
            broadcastFeed({
              stream,
              data,
              timestamp: timestamp || new Date().toISOString()
            });
          }
        } catch {
          // Ignore malformed upstream frames; the connection itself remains usable.
        }
      }
    });

    socket.on('error', error => {
      const message = error instanceof Error ? error.message : 'F1 upstream socket error';
      setUpstreamState('ERROR', message);
      broadcastFeed({
        stream: 'ProxyStatus',
        data: { error: message },
        timestamp: new Date().toISOString()
      });
    });

    socket.on('close', () => {
      upstream = null;
      setUpstreamState('DISCONNECTED');
      scheduleReconnect();
    });
  } catch (error) {
    upstream = null;
    const message = error instanceof Error ? error.message : 'F1 upstream unavailable';
    setUpstreamState('ERROR', message);
    broadcastFeed({
      stream: 'ProxyStatus',
      data: { error: message },
      timestamp: new Date().toISOString()
    });
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer || reconnectAttempt >= 8) return;

  const delay = Math.min(30000, 2000 * Math.pow(2, reconnectAttempt));
  reconnectAttempt += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectUpstream();
  }, delay);
}

httpServer.listen(PORT, () => {
  void connectUpstream();
});

process.on('SIGINT', () => {
  upstream?.close();
  httpServer.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  upstream?.close();
  httpServer.close(() => process.exit(0));
});
