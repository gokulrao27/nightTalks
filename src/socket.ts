const WS_URL = import.meta.env.VITE_WS_URL as string;

type Handler = (payload: unknown) => void;

let ws: WebSocket | null = null;
let reconnectTimer: number | undefined;
let currentToken = '';
const handlers = new Map<string, Set<Handler>>();

export function connectSocket(token: string): void {
  currentToken = token;
  connect();
}

function connect(): void {
  if (ws && ws.readyState < WebSocket.CLOSING) ws.close(4000);
  ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(currentToken)}`);

  ws.onopen = () => {
    console.info('[WS] Connected to', WS_URL);
    window.clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
      if (msg.type === 'pong') { console.info('[WS] Ping-pong confirmed'); return; }
      handlers.get(msg.type)?.forEach((h) => h(msg.payload));
    } catch { /* ignore malformed */ }
  };

  ws.onclose = (event) => {
    console.warn('[WS] Closed — code:', event.code, event.reason || '');
    if (event.code === 4001) {
      console.error('[WS] Auth failed — JWT may be expired');
      return;
    }
    if (currentToken) reconnectTimer = window.setTimeout(() => connect(), 3_000);
  };

  ws.onerror = () => {
    console.error('[WS] Error — check VITE_WS_URL and backend CORS');
    ws?.close();
  };
}

export function disconnectSocket(): void {
  window.clearTimeout(reconnectTimer);
  ws?.close(4001);
  ws = null;
  currentToken = '';
}

export function send(type: string, payload?: unknown): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, payload }));
}

export function on(type: string, handler: Handler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => { handlers.get(type)?.delete(handler); };
}

export function off(type: string): void {
  handlers.delete(type);
}
