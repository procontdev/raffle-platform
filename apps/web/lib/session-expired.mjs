export const SESSION_EXPIRED_REASON = 'session-expired';

export function isAuthenticatedSessionFailure(status, accessToken) {
  return status === 401 && Boolean(accessToken);
}

export function hasSessionExpiredReason(search) {
  return new URLSearchParams(search).get('reason') === SESSION_EXPIRED_REASON;
}

export function handleSessionExpired(storage, location) {
  storage.removeItem('raffle_access_token');
  storage.removeItem('raffle_user');
  if (location.pathname !== '/login') {
    location.replace(`/login?reason=${SESSION_EXPIRED_REASON}`);
    return true;
  }
  return false;
}
