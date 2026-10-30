export function normalizeRehearsalCandidates(payload) {
  if (!Array.isArray(payload?.candidates)) return [];
  return payload.candidates.filter((candidate) => typeof candidate?.displayName === 'string' && typeof candidate?.ticketNumber === 'string');
}
