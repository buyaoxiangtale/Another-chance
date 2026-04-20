-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC', 'UNLISTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rootSegmentId" TEXT,
    "era" TEXT,
    "genre" TEXT,
    "ownerId" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_segments" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isBranchPoint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "parentSegmentId" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeline" JSONB,
    "historicalReferences" JSONB,
    "narrativePace" TEXT,
    "mood" TEXT,
    "characterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "story_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_branches" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceSegmentId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userDirection" TEXT NOT NULL,
    "characterStateSnapshot" JSONB,
    "forkTimeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "story_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "era" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "speechPatterns" TEXT NOT NULL DEFAULT '',
    "coreMotivation" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "traits" JSONB NOT NULL DEFAULT '[]',
    "relationships" JSONB NOT NULL DEFAULT '[]',
    "stateHistory" JSONB NOT NULL DEFAULT '[]',
    "storyId" TEXT NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_states" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "characterStates" JSONB NOT NULL DEFAULT '{}',
    "worldVariables" JSONB NOT NULL DEFAULT '{}',
    "activeConstraints" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_summaries" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segment_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_events" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "segmentId" TEXT,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "era" TEXT,
    "year" INTEGER,
    "season" TEXT,
    "narrativeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "stories_rootSegmentId_key" ON "stories"("rootSegmentId");

-- CreateIndex
CREATE INDEX "stories_visibility_publishedAt_idx" ON "stories"("visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "stories_ownerId_idx" ON "stories"("ownerId");

-- CreateIndex
CREATE INDEX "story_segments_storyId_branchId_idx" ON "story_segments"("storyId", "branchId");

-- CreateIndex
CREATE INDEX "story_segments_storyId_idx" ON "story_segments"("storyId");

-- CreateIndex
CREATE INDEX "story_segments_branchId_idx" ON "story_segments"("branchId");

-- CreateIndex
CREATE INDEX "story_branches_storyId_idx" ON "story_branches"("storyId");

-- CreateIndex
CREATE INDEX "story_branches_ownerId_idx" ON "story_branches"("ownerId");

-- CreateIndex
CREATE INDEX "story_branches_visibility_idx" ON "story_branches"("visibility");

-- CreateIndex
CREATE INDEX "characters_storyId_idx" ON "characters"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "director_states_storyId_key" ON "director_states"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "segment_summaries_segmentId_key" ON "segment_summaries"("segmentId");

-- CreateIndex
CREATE INDEX "key_events_storyId_idx" ON "key_events"("storyId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_rootSegmentId_fkey" FOREIGN KEY ("rootSegmentId") REFERENCES "story_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_segments" ADD CONSTRAINT "story_segments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_branches" ADD CONSTRAINT "story_branches_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_branches" ADD CONSTRAINT "story_branches_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_branches" ADD CONSTRAINT "story_branches_sourceSegmentId_fkey" FOREIGN KEY ("sourceSegmentId") REFERENCES "story_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_states" ADD CONSTRAINT "director_states_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_summaries" ADD CONSTRAINT "segment_summaries_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "story_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_events" ADD CONSTRAINT "key_events_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
