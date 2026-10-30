export declare const SESSION_EXPIRED_REASON: 'session-expired';
export declare function isAuthenticatedSessionFailure(status: number, accessToken: string | null): boolean;
export declare function hasSessionExpiredReason(search: string): boolean;
export declare function handleSessionExpired(storage: Storage, location: Location): boolean;
