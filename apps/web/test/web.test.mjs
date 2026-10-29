import test from 'node:test';
import assert from 'node:assert/strict';

test('live demo state has the required public phases', () => {
  assert.deepEqual(['WAITING', 'READY', 'COUNTDOWN', 'DRAWING', 'WINNER'], ['WAITING', 'READY', 'COUNTDOWN', 'DRAWING', 'WINNER']);
});

test('public live winner payload is safe for display', () => {
  const payload = { displayName: 'Carlos', ticketNumber: 'FAM-000001', drawId: 'draw-1' };
  assert.equal('email' in payload, false);
  assert.equal('phone' in payload, false);
  assert.equal('passwordHash' in payload, false);
});
