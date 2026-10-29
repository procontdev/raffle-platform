-- Iteration 4: immutable draw sessions, deterministic results and audit events.
CREATE TYPE "DrawSessionStatus" AS ENUM ('READY', 'DRAWING', 'COMPLETED');
CREATE TYPE "AuditEventType" AS ENUM ('RAFFLE_CLOSED', 'DRAW_STARTED', 'DRAW_COMPLETED');

CREATE TABLE "draw_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "participant_snapshot" JSONB NOT NULL,
    "participant_snapshot_hash" TEXT NOT NULL,
    "seed_commitment" TEXT NOT NULL,
    "secret_seed" TEXT NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "status" "DrawSessionStatus" NOT NULL DEFAULT 'READY',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "draw_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draw_results" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "draw_session_id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "winner_entry_id" UUID NOT NULL,
    "winner_index" INTEGER NOT NULL,
    "result_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draw_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "type" "AuditEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draw_sessions_raffle_id_key" ON "draw_sessions"("raffle_id");
CREATE UNIQUE INDEX "draw_sessions_organization_id_raffle_id_key" ON "draw_sessions"("organization_id", "raffle_id");
CREATE UNIQUE INDEX "draw_results_draw_session_id_key" ON "draw_results"("draw_session_id");
CREATE UNIQUE INDEX "draw_results_raffle_id_key" ON "draw_results"("raffle_id");
CREATE INDEX "draw_results_organization_id_raffle_id_idx" ON "draw_results"("organization_id", "raffle_id");
CREATE INDEX "audit_events_organization_id_raffle_id_created_at_idx" ON "audit_events"("organization_id", "raffle_id", "created_at");

ALTER TABLE "draw_sessions" ADD CONSTRAINT "draw_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draw_sessions" ADD CONSTRAINT "draw_sessions_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_draw_session_id_fkey" FOREIGN KEY ("draw_session_id") REFERENCES "draw_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "raffle_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
