-- Soft deletion for participants. Historical entries remain linked to archived participants.
ALTER TABLE "participants" ADD COLUMN "archived_at" TIMESTAMP(3);
CREATE INDEX "participants_organization_id_archived_at_idx" ON "participants"("organization_id", "archived_at");
