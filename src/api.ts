const BASE = import.meta.env.VITE_API_URL as string;

export function getToken(): string | null {
  return localStorage.getItem('nc:token');
}

export function getUser(): User | null {
  const raw = localStorage.getItem('nc:user');
  return raw ? (JSON.parse(raw) as User) : null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    async init(payload: {
      pseudonym: string;
      avatar: string;
      timezone: string;
      consent_age: boolean;
      consent_anon: boolean;
      consent_terms: boolean;
    }): Promise<{ token: string; user: User }> {
      return request('POST', '/auth/init', payload);
    },
  },

  me: {
    async get(): Promise<User> {
      return request('GET', '/me');
    },
    async update(payload: Partial<Pick<User, 'pseudonym' | 'avatar' | 'timezone'>>): Promise<User> {
      return request('PUT', '/me', payload);
    },
    async delete(): Promise<void> {
      return request('DELETE', '/me');
    },
  },

  wall: {
    async list(cursor?: string): Promise<{ posts: WallPost[]; nextCursor: string | null }> {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request('GET', `/wall${qs}`);
    },
    async post(body: string): Promise<WallPost> {
      return request('POST', '/wall', { body });
    },
  },

  calls: {
    async history(cursor?: string): Promise<{ calls: CallRecord[]; nextCursor: string | null }> {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request('GET', `/call/history${qs}`);
    },
    async iceConfig(): Promise<{ iceServers: RTCIceServer[] }> {
      return request('GET', '/call/ice-config');
    },
    async end(roomId: string): Promise<void> {
      return request('POST', '/call/end', { roomId });
    },
  },

  words: {
    async save(callId: string, word: string): Promise<void> {
      return request('POST', '/word', { callId, word });
    },
  },

  reports: {
    async send(reportedId: string, callId: string, reason: string): Promise<void> {
      return request('POST', '/report', { reportedId, callId, reason });
    },
  },

  push: {
    async subscribe(subscription: PushSubscriptionJSON): Promise<void> {
      return request('POST', '/push/subscribe', subscription);
    },
    async unsubscribe(): Promise<void> {
      return request('DELETE', '/push/subscribe');
    },
  },
};

export interface User {
  id: string;
  pseudonym: string;
  avatar: string;
  timezone: string;
  tier: 'free' | 'premium';
}

export interface WallPost {
  id: string;
  body: string;
  country_vague: string | null;
  created_at: string;
}

export interface CallRecord {
  id: string;
  started_at: string;
  duration_secs: number;
  word: string | null;
}
