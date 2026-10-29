export type RaffleStatus = 'DRAFT' | 'OPEN' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'CLOSED' | 'DRAWING';
export type EntrySource = 'YAPE' | 'YOUTUBE_MEMBER' | 'MANUAL' | 'COURTESY' | 'IMPORT';
export type EntryStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';

export interface User { id: string; email: string; role: string; organizationId: string }
export interface Organization { id: string; name: string; slug: string; status: string }
export interface Brand { id: string; name: string; slug: string; logoUrl?: string | null; themeConfig?: Record<string, string> | null }
export interface Raffle { id: string; name: string; slug: string; description?: string | null; prizeName: string; prizeDescription?: string | null; prizeImageUrl?: string | null; status: RaffleStatus; startsAt?: string | null; closesAt?: string | null; brand?: Brand | null; organizationId: string; nextTicketSequence?: number }
export interface Participant { id: string; displayName: string; fullName?: string | null; email?: string | null; phone?: string | null; organizationId: string }
export interface Entry { id: string; raffleId: string; participantId: string; ticketNumber: string; source: EntrySource; status: EntryStatus; paymentReference?: string | null; paymentAmount?: number | string | null }
export interface DrawSession { id: string; raffleId: string; status: string; participantSnapshotHash: string; seedCommitment: string; algorithmVersion: string }
export interface PublicRaffle extends Raffle { participants: number; tickets: number; brand: Brand | null; snapshotHash: string | null; seedCommitment: string | null; draw: { drawId: string; winnerTicketNumber: string; displayName: string } | null }
