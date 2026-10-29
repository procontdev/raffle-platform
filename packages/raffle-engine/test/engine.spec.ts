import {
  calculateResultHash,
  calculateWinnerIndex,
  canonicalizeSnapshot,
  commitSeed,
  hashSnapshot,
  selectWinner,
  verifyDraw,
  winnerIndexFromCandidateHashes,
  generateSecretSeed,
} from '../src/index.js';

const entries = [
  { entryId: 'e2', ticketNumber: 'FAM-000002' },
  { entryId: 'e1', ticketNumber: 'FAM-000001' },
];

describe('raffle-engine v1', () => {
  it('canonicalizes snapshots deterministically regardless of input order', () => {
    expect(canonicalizeSnapshot(entries)).toEqual([
      { entryId: 'e1', ticketNumber: 'FAM-000001' },
      { entryId: 'e2', ticketNumber: 'FAM-000002' },
    ]);
    expect(canonicalizeSnapshot(entries)).toEqual(canonicalizeSnapshot([...entries].reverse()));
  });

  it('hashes the same snapshot identically and changes when snapshot changes', () => {
    const hash = hashSnapshot(entries);
    expect(hash).toBe(hashSnapshot([...entries].reverse()));
    expect(hash).not.toBe(hashSnapshot([...entries, { entryId: 'e3', ticketNumber: 'FAM-000003' }]));
  });

  it('commits a seed with SHA-256', () => {
    expect(commitSeed('secret-seed')).toBe('46015ded33413621dacd04c2b7d0e87458df7cdaea6354298e504f5f5f50308d');
  });

  it('generates a 32-byte hexadecimal seed with entropy', () => {
    const first = generateSecretSeed();
    const second = generateSecretSeed();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
    expect(commitSeed(first)).toBe(commitSeed(first));
  });

  it('calculates deterministic result and winner index in range', () => {
    const resultHash = calculateResultHash({ algorithmVersion: 'v1', raffleId: 'raffle-1', participantSnapshotHash: hashSnapshot(entries), secretSeed: 'secret-seed' });
    expect(resultHash).toBe(calculateResultHash({ algorithmVersion: 'v1', raffleId: 'raffle-1', participantSnapshotHash: hashSnapshot(entries), secretSeed: 'secret-seed' }));
    const winnerIndex = calculateWinnerIndex(resultHash, entries.length);
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    expect(winnerIndex).toBeLessThan(entries.length);
    expect(calculateWinnerIndex(resultHash, 1)).toBe(0);
    expect(() => calculateWinnerIndex(resultHash, 0)).toThrow();
  });

  it('performs deterministic rejection sampling with a retry candidate', () => {
    const maxMinusOne = 'f'.repeat(64);
    const retryCandidate = `${'0'.repeat(63)}1`;
    const totalEntries = (1n << 256n) - 1n;
    expect(winnerIndexFromCandidateHashes([maxMinusOne], totalEntries)).toBeUndefined();
    expect(winnerIndexFromCandidateHashes([maxMinusOne, retryCandidate], totalEntries)).toBe(1n);
  });

  it('verifies a valid draw and rejects manipulated snapshot, seed and winner', () => {
    const snapshot = canonicalizeSnapshot(entries);
    const participantSnapshotHash = hashSnapshot(snapshot);
    const revealedSeed = 'secret-seed';
    const seedCommitment = commitSeed(revealedSeed);
    const resultHash = calculateResultHash({ algorithmVersion: 'v1', raffleId: 'raffle-1', participantSnapshotHash, secretSeed: revealedSeed });
    const winnerIndex = calculateWinnerIndex(resultHash, snapshot.length);
    const proof = { algorithmVersion: 'v1', raffleId: 'raffle-1', participantSnapshot: snapshot, participantSnapshotHash, seedCommitment, revealedSeed, resultHash, winnerIndex, winnerTicketNumber: selectWinner(snapshot, winnerIndex).ticketNumber };
    expect(verifyDraw(proof).valid).toBe(true);
    expect(verifyDraw({ ...proof, participantSnapshot: [...snapshot, { entryId: 'tampered', ticketNumber: 'FAM-999999' }] }).valid).toBe(false);
    expect(verifyDraw({ ...proof, revealedSeed: 'other-seed' }).valid).toBe(false);
    expect(verifyDraw({ ...proof, participantSnapshotHash: '0'.repeat(64) }).valid).toBe(false);
    expect(verifyDraw({ ...proof, resultHash: '0'.repeat(64) }).valid).toBe(false);
    expect(verifyDraw({ ...proof, winnerIndex: (winnerIndex + 1) % snapshot.length }).valid).toBe(false);
    expect(verifyDraw({ ...proof, winnerTicketNumber: 'FAM-999999' }).valid).toBe(false);
  });
});
