-- Iteration 3: participants, raffle entries and concurrency-safe ticket sequences.
CREATE TYPE "RaffleEntrySource" AS ENUM ('YAPE', 'YOUTUBE_MEMBER', 'MANUAL', 'COURTESY', 'IMPORT');

CREATE TYPE "RaffleEntryStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'CANCELLED');

ALTER TABLE "raffles"
ADD COLUMN "next_ticket_sequence" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "raffle_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "source" "RaffleEntrySource" NOT NULL,
    "payment_reference" TEXT,
    "payment_amount" DECIMAL(12,2),
    "status" "RaffleEntryStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffle_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_entries_raffle_id_ticket_number_key" ON "raffle_entries"("raffle_id", "ticket_number");
CREATE INDEX "raffle_entries_organization_id_raffle_id_idx" ON "raffle_entries"("organization_id", "raffle_id");
CREATE INDEX "raffle_entries_organization_id_participant_id_idx" ON "raffle_entries"("organization_id", "participant_id");
CREATE INDEX "raffle_entries_raffle_id_status_idx" ON "raffle_entries"("raffle_id", "status");

ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
