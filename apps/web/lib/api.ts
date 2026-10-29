import { token } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers, cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (response.status === 401 && typeof window !== 'undefined') { localStorage.removeItem('raffle_access_token'); localStorage.removeItem('raffle_user'); }
  if (!response.ok) throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`);
  return body as T;
}

export function post<T>(path: string, body?: unknown) { return api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }); }
export function patch<T>(path: string, body: unknown) { return api<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
export function upload<T>(path: string, file: File) { const form = new FormData(); form.append('file', file); return api<T>(path, { method: 'POST', body: form }); }
