-- Global LIVE marquee speed for each organization.
ALTER TABLE "organizations" ADD COLUMN "marquee_speed_seconds" INTEGER NOT NULL DEFAULT 24;
