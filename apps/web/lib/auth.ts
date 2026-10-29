import type { User } from './types';

const TOKEN_KEY = 'raffle_access_token';
const USER_KEY = 'raffle_user';
export function token() { return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY); }
export function user(): User | null { if (typeof window === 'undefined') return null; const value = localStorage.getItem(USER_KEY); return value ? JSON.parse(value) as User : null; }
export function saveSession(accessToken: string, currentUser: User) { localStorage.setItem(TOKEN_KEY, accessToken); localStorage.setItem(USER_KEY, JSON.stringify(currentUser)); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
