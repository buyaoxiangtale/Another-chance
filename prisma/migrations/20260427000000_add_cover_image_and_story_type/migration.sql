-- Add coverImageUrl and storyType columns to stories table
-- These fields were defined in Prisma schema but missing from the initial migration

ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "storyType" TEXT;
