declare module '*.mjs' {
  export const SESSION_EXPIRED_REASON: 'session-expired';
  export function isAuthenticatedSessionFailure(status: number, accessToken: string | null): boolean;
  export function hasSessionExpiredReason(search: string): boolean;
  export function handleSessionExpired(storage: Storage, location: Location): boolean;
  export function normalizeRehearsalCandidates(payload: unknown): Array<{ displayName: string; ticketNumber: string }>;
  export function resolveLiveTemplate(requested: string | null, configured?: string): 'classic' | 'spotlight';
}
