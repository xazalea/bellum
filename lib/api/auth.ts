import type { LoginCredentials, SignupCredentials, AuthResponse, Session } from '@/lib/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> =>
    request(`${API_BASE}/challenger/auth/signin`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  signup: (credentials: SignupCredentials): Promise<AuthResponse> =>
    request(`${API_BASE}/challenger/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getSession: (): Promise<Session> =>
    request(`${API_BASE}/auth/session`),

  logout: async (): Promise<void> => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  },
};
