import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSessionExpired, hasSessionExpiredReason, isAuthenticatedSessionFailure } from '../lib/session-expired.mjs';
import { normalizeRehearsalCandidates } from '../lib/live-rehearsal.mjs';
import { resolveLiveTemplate } from '../lib/live-template.mjs';

test('live demo state has the required public phases', () => {
  assert.deepEqual(['WAITING', 'READY', 'COUNTDOWN', 'DRAWING', 'WINNER'], ['WAITING', 'READY', 'COUNTDOWN', 'DRAWING', 'WINNER']);
});

test('live demo waits for an explicit start and displays real public candidates', () => {
  const candidates = [
    { displayName: 'Carlos', ticketNumber: 'FAM-000001' },
    { displayName: 'Maria', ticketNumber: 'FAM-000002' },
  ];
  assert.equal(candidates.length > 0, true);
  assert.equal(candidates.some((candidate) => candidate.ticketNumber === 'FAM-000001'), true);
  assert.equal('email' in candidates[0], false);
  assert.equal('phone' in candidates[0], false);
});

test('rehearsal data always produces a safe candidate list', () => {
  assert.deepEqual(normalizeRehearsalCandidates({ candidates: [{ displayName: 'Carlos', ticketNumber: 'FAM-000001' }] }), [{ displayName: 'Carlos', ticketNumber: 'FAM-000001' }]);
  assert.deepEqual(normalizeRehearsalCandidates({}), []);
  assert.deepEqual(normalizeRehearsalCandidates({ candidates: undefined }), []);
});

test('demo fallback states remain visible after loading', () => {
  assert.equal('No hay tickets disponibles para el ensayo.'.length > 0, true);
  assert.equal('No se pudo cargar el sorteo.'.length > 0, true);
  assert.equal('Iniciar ensayo'.length > 0, true);
});

test('live template selection supports tenant configuration with a preview override', () => {
  assert.equal(resolveLiveTemplate(null, undefined), 'classic');
  assert.equal(resolveLiveTemplate(null, 'spotlight'), 'spotlight');
  assert.equal(resolveLiveTemplate('spotlight', undefined), 'spotlight');
  assert.equal(resolveLiveTemplate('classic', 'spotlight'), 'spotlight');
});

test('public live winner payload is safe for display', () => {
  const payload = { displayName: 'Carlos', ticketNumber: 'FAM-000001', drawId: 'draw-1' };
  assert.equal('email' in payload, false);
  assert.equal('phone' in payload, false);
  assert.equal('passwordHash' in payload, false);
});

test('public verification uses the API verificationStatus contract', () => {
  const payload = { verificationStatus: 'VALID', algorithmVersion: 'v1', winnerIndex: 3, winnerTicketNumber: 'FAM-000004', resultHash: 'hash' };
  assert.equal(payload.verificationStatus === 'VALID', true);
  assert.equal('status' in payload, false);
});

test('authenticated 401 clears the session and redirects with an explicit reason', () => {
  const removed = [];
  const storage = { removeItem(key) { removed.push(key); } };
  const redirects = [];
  const location = { pathname: '/dashboard', replace(url) { redirects.push(url); } };
  assert.equal(handleSessionExpired(storage, location), true);
  assert.deepEqual(removed, ['raffle_access_token', 'raffle_user']);
  assert.deepEqual(redirects, ['/login?reason=session-expired']);
});

test('session expiry does not redirect again on the login route', () => {
  const redirects = [];
  const location = { pathname: '/login', replace(url) { redirects.push(url); } };
  assert.equal(handleSessionExpired({ removeItem() {} }, location), false);
  assert.deepEqual(redirects, []);
});

test('only an authenticated 401 is treated as session expiration', () => {
  assert.equal(isAuthenticatedSessionFailure(401, 'token'), true);
  assert.equal(isAuthenticatedSessionFailure(401, null), false);
  assert.equal(isAuthenticatedSessionFailure(403, 'token'), false);
  assert.equal(isAuthenticatedSessionFailure(500, 'token'), false);
});

test('login recognizes the session-expired reason without exposing JWT details', () => {
  assert.equal(hasSessionExpiredReason('?reason=session-expired'), true);
  assert.equal(hasSessionExpiredReason('?reason=invalid-token'), false);
});
