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

  ws.onmessage = (event) => {
    try {
      const { type, payload } = JSON.parse(event.data as string) as { type: string; payload: unknown };
      handlers.get(type)?.forEach((h) => h(payload));
    } catch { /* ignore malformed */ }
  };

  ws.onclose = (event) => {
    if (event.code === 4001) return;
    reconnectTimer = window.setTimeout(() => connect(), 3_000);
  };

  ws.onerror = () => { ws?.close(); };
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
