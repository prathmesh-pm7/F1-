import express from 'express';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';

const PORT = Number(process.env.F1_PROXY_PORT ?? 8787);
const UPSTREAM_WS = 'wss://livetiming.formula1.com/signalrcore';
const NEGOTIATE_URL = 'https://livetiming.formula1.com/signalrcore/negotiate?negotiateVersion=1';
const TOPICS = ['Heartbeat','DriverList','ExtrapolatedClock','RaceControlMessages','SessionData','SessionInfo','SessionStatus','TeamRadio','TimingAppData','TimingStats','TrackStatus','WeatherData','Position.z','CarData.z','LapCount','TimingData','TopThree'];

const app = express();
const httpServer = createServer(app);
const clients = new Set<express.Response>();
let upstream: WebSocket | null = null;
let upstreamState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempt = 0;
let lastMessageAt: string | null = null;

app.get('/api/health', (_req, res) => res.json({ ok: upstreamState === 'CONNECTED', upstream: upstreamState, clients: clients.size, lastMessageAt }));
app.get('/api/live-timing', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  res.write('event: status\\ndata: {"state":"CONNECTING"}\\n\\n'); clients.add(res); req.on('close', () => clients.delete(res));
});

function broadcastFeed(payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of clients) client.write('event: feed\\ndata: ' + data + '\\n\\n');
}

async function getCookie(): Promise<string> {
  const response = await fetch(NEGOTIATE_URL, { method: 'OPTIONS', headers: { Origin: 'https://www.formula1.com', Referer: 'https://www.formula1.com/', 'User-Agent': 'Mozilla/5.0 F1-Pulse' } });
  if (!response.ok) throw new Error('F1 negotiate HTTP ' + response.status);
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  const aws = cookies.find(cookie => cookie.startsWith('AWSALBCORS='));
  if (!aws) throw new Error('F1 negotiate did not return AWSALBCORS cookie');
  return aws.split(';', 1)[0];
}

function sendSignalR(message: unknown) { upstream?.send(JSON.stringify(message) + '\u001e'); }

async function connectUpstream() {
  if (upstreamState === 'CONNECTING' || upstreamState === 'CONNECTED') return;
  upstreamState = 'CONNECTING';
  try {
    const cookie = await getCookie();
    const socket = new WebSocket(UPSTREAM_WS, { headers: { Cookie: cookie, Origin: 'https://www.formula1.com', Referer: 'https://www.formula1.com/', 'User-Agent': 'Mozilla/5.0 F1-Pulse' } });
    upstream = socket;
    socket.on('open', () => { reconnectAttempt = 0; upstreamState = 'CONNECTED'; sendSignalR({ protocol: 'json', version: 1 }); });
    socket.on('message', raw => {
      lastMessageAt = new Date().toISOString();
      for (const part of String(raw).split('\u001e').filter(Boolean)) {
        try {
          const message = JSON.parse(part);
          if (message && Object.keys(message).length === 0) { sendSignalR({ type: 1, invocationId: '1', target: 'Subscribe', arguments: [TOPICS] }); continue; }
          if (message?.type === 6) { sendSignalR({ type: 6 }); continue; }
          if (message?.type === 1 && message.target === 'feed' && Array.isArray(message.arguments)) {
            const [stream, data, timestamp] = message.arguments; broadcastFeed({ stream, data, timestamp: timestamp || new Date().toISOString() });
          }
        } catch { /* ignore malformed upstream frames */ }
      }
    });
    socket.on('error', () => { upstreamState = 'ERROR'; });
    socket.on('close', () => { upstream = null; upstreamState = 'DISCONNECTED'; scheduleReconnect(); });
  } catch (error) {
    upstream = null; upstreamState = 'ERROR'; broadcastFeed({ stream: 'ProxyStatus', data: { error: error instanceof Error ? error.message : 'Upstream unavailable' }, timestamp: new Date().toISOString() }); scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer || reconnectAttempt >= 8) return;
  const delay = Math.min(30000, 2000 * Math.pow(2, reconnectAttempt++));
  reconnectTimer = setTimeout(() => { reconnectTimer = null; void connectUpstream(); }, delay);
}

httpServer.listen(PORT, () => { void connectUpstream(); });
process.on('SIGINT', () => { upstream?.close(); httpServer.close(() => process.exit(0)); });
process.on('SIGTERM', () => { upstream?.close(); httpServer.close(() => process.exit(0)); });
