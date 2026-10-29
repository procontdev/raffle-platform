# Raffle Engine v1 cryptographic specification

The engine is a pure TypeScript library. It has no dependency on NestJS, Prisma, PostgreSQL, HTTP, OBS or tenant-specific branding.

## Canonical snapshot

Only validated entries are included. Each entry is reduced to `{ entryId, ticketNumber }` and sorted lexicographically by `ticketNumber`; `entryId` is the deterministic tie-breaker. The serialized snapshot is `JSON.stringify(sortedEntries)` using UTF-8. `participantSnapshotHash` is the lowercase hexadecimal SHA-256 digest of that serialization.

## Seed and commitment

`generateSecretSeed()` produces 32 cryptographically secure random bytes with `crypto.randomBytes(32)` and returns their lowercase hexadecimal representation (64 hexadecimal characters). The persisted `secretSeed` is therefore a hex string. `seedCommitment` is `SHA256(UTF8(secretSeed))`, meaning the UTF-8 bytes of the hexadecimal string are hashed, not the decoded raw bytes.

## Result hash

The canonical draw input is the following UTF-8 string, joined with literal newline characters and no trailing newline:

```text
raffle-platform-draw:v1
raffleId=<uuid>
snapshotHash=<participantSnapshotHash>
seed=<secretSeed-hex>
```

`resultHash = SHA256(UTF8(canonicalDrawInput))`.

## Uniform winner index

Let `MAX = 2^256`, `N = totalEntries`, and `limit = MAX - (MAX % N)`. The first candidate is the full 256-bit integer represented by `resultHash` (all 64 hexadecimal characters), not a prefix. If `candidate < limit`, the index is `candidate % N`. Otherwise candidate `retry:r` is `SHA256(UTF8(resultHash + "\nretry:" + r))`, starting with `r = 1`, and the same test repeats. No random source is used during index selection and `Math.random()` is never used.

`verifyDraw()` recomputes the commitment, snapshot hash, result hash, rejection-sampled index and selected ticket. It does not trust persisted winner fields.

## Security debt

Pre-draw seed confidentiality depends on database/operator security. KMS or envelope encryption is intentionally deferred.
