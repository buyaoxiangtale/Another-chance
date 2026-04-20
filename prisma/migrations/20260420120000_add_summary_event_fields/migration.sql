-- AlterTable: SegmentSummary - add new fields
ALTER TABLE "segment_summaries" ADD COLUMN "storyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "segment_summaries" ADD COLUMN "branchId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "segment_summaries" ADD COLUMN "chainIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "segment_summaries" ADD COLUMN "originalTokenCount" INTEGER;
ALTER TABLE "segment_summaries" ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "segment_summaries" ADD COLUMN "metadata" JSONB;

-- Drop old unique constraint on segmentId
ALTER TABLE "segment_summaries" DROP CONSTRAINT IF EXISTS "segment_summaries_segmentId_key";

-- Add new unique constraint on segmentId + branchId
ALTER TABLE "segment_summaries" ADD CONSTRAINT "segment_summaries_segmentId_branchId_key" UNIQUE ("segmentId", "branchId");

-- Create index
CREATE INDEX "segment_summaries_storyId_branchId_idx" ON "segment_summaries"("storyId", "branchId");

-- AlterTable: KeyEvent - add new fields
ALTER TABLE "key_events" ADD COLUMN "branchId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "key_events" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "key_events" ADD COLUMN "importance" TEXT NOT NULL DEFAULT 'major';
ALTER TABLE "key_events" ADD COLUMN "involvedCharacterIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "key_events" ADD COLUMN "resolvedBySegmentId" TEXT;
ALTER TABLE "key_events" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index for key_events
CREATE INDEX "key_events_storyId_branchId_idx" ON "key_events"("storyId", "branchId");
