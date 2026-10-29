import { createHash, randomBytes } from 'node:crypto';

export const RAFFLE_ENGINE_VERSION = 'v1';
export const DRAW_DOMAIN = 'raffle-platform-draw:v1';
export const RESULT_HASH_SEPARATOR = '\n';

export interface SnapshotEntry {
  entryId: string;
  ticketNumber: string;
}

export interface DrawProof {
  algorithmVersion: string;
  raffleId: string;
  participantSnapshot: SnapshotEntry[];
  participantSnapshotHash: string;
  seedCommitment: string;
  revealedSeed: string;
  resultHash: string;
  winnerIndex: number;
  winnerTicketNumber: string;
}

export interface VerificationResult {
  valid: boolean;
  expectedParticipantSnapshotHash: string;
  expectedSeedCommitment: string;
  expectedResultHash: string;
  expectedWinnerIndex: number;
  expectedWinnerTicketNumber: string;
}

export function canonicalizeSnapshot(entries: SnapshotEntry[]): SnapshotEntry[] {
  return entries
    .map(({ entryId, ticketNumber }) => ({ entryId, ticketNumber }))
    .sort((left, right) => left.ticketNumber < right.ticketNumber ? -1 : left.ticketNumber > right.ticketNumber ? 1 : left.entryId < right.entryId ? -1 : left.entryId > right.entryId ? 1 : 0);
}

export function serializeSnapshot(snapshot: SnapshotEntry[]): string {
  return JSON.stringify(canonicalizeSnapshot(snapshot));
}

export function hashSnapshot(snapshot: SnapshotEntry[]): string {
  return sha256(serializeSnapshot(snapshot));
}

export function generateSecretSeed(): string {
  return randomBytes(32).toString('hex');
}

export function commitSeed(secretSeed: string): string {
  return sha256(secretSeed);
}

export function calculateResultHash(input: { algorithmVersion: string; raffleId: string; participantSnapshotHash: string; secretSeed: string }): string {
  const canonicalDrawInput = [
    DRAW_DOMAIN,
    `raffleId=${input.raffleId}`,
    `snapshotHash=${input.participantSnapshotHash}`,
    `seed=${input.secretSeed}`,
  ].join(RESULT_HASH_SEPARATOR);
  return sha256(canonicalDrawInput);
}

export function calculateWinnerIndex(resultHash: string, totalEntries: number): number {
  if (!Number.isInteger(totalEntries) || totalEntries <= 0) throw new Error('totalEntries must be greater than zero');
  if (!/^[a-f0-9]{64}$/i.test(resultHash)) throw new Error('resultHash must be a SHA-256 hex string');
  const max = 1n << 256n;
  const limit = max - (max % BigInt(totalEntries));
  let candidateHash = resultHash;
  let retryNumber = 1;
  while (true) {
    const candidate = BigInt(`0x${candidateHash}`);
    if (candidate < limit) return Number(candidate % BigInt(totalEntries));
    candidateHash = sha256(`${resultHash}${RESULT_HASH_SEPARATOR}retry:${retryNumber}`);
    retryNumber += 1;
  }
}

/** Testable rejection-sampling primitive. Returns undefined when all candidates are rejected. */
export function winnerIndexFromCandidateHashes(candidateHashes: string[], totalEntries: bigint): bigint | undefined {
  if (totalEntries <= 0n) throw new Error('totalEntries must be greater than zero');
  const max = 1n << 256n;
  const limit = max - (max % totalEntries);
  for (const candidateHash of candidateHashes) {
    if (!/^[a-f0-9]{64}$/i.test(candidateHash)) throw new Error('candidateHash must be a SHA-256 hex string');
    const candidate = BigInt(`0x${candidateHash}`);
    if (candidate < limit) return candidate % totalEntries;
  }
  return undefined;
}

export function selectWinner<T>(entries: T[], winnerIndex: number): T {
  if (entries.length === 0) throw new Error('Cannot select a winner from zero entries');
  if (!Number.isInteger(winnerIndex) || winnerIndex < 0 || winnerIndex >= entries.length) throw new Error('winnerIndex is out of range');
  return entries[winnerIndex];
}

export function verifyDraw(proof: DrawProof): VerificationResult {
  const snapshot = canonicalizeSnapshot(proof.participantSnapshot);
  const expectedParticipantSnapshotHash = hashSnapshot(snapshot);
  const expectedSeedCommitment = commitSeed(proof.revealedSeed);
  const expectedResultHash = calculateResultHash({ algorithmVersion: proof.algorithmVersion, raffleId: proof.raffleId, participantSnapshotHash: expectedParticipantSnapshotHash, secretSeed: proof.revealedSeed });
  const expectedWinnerIndex = calculateWinnerIndex(expectedResultHash, snapshot.length);
  const expectedWinnerTicketNumber = selectWinner(snapshot, expectedWinnerIndex).ticketNumber;
  return {
    valid: expectedParticipantSnapshotHash === proof.participantSnapshotHash && expectedSeedCommitment === proof.seedCommitment && expectedResultHash === proof.resultHash && expectedWinnerIndex === proof.winnerIndex && expectedWinnerTicketNumber === proof.winnerTicketNumber,
    expectedParticipantSnapshotHash,
    expectedSeedCommitment,
    expectedResultHash,
    expectedWinnerIndex,
    expectedWinnerTicketNumber,
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
