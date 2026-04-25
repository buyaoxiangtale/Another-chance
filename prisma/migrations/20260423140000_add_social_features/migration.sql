-- Add model field to story_branches
ALTER TABLE "story_branches" ADD COLUMN "model" TEXT;

-- Create story_likes table
CREATE TABLE "story_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("id")
);

-- Create comments table
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "branchId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create comment_likes table
CREATE TABLE "comment_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- Create indexes for story_likes
CREATE UNIQUE INDEX "story_likes_userId_storyId_key" ON "story_likes"("userId", "storyId");
CREATE UNIQUE INDEX "story_likes_userId_branchId_key" ON "story_likes"("userId", "branchId");
CREATE INDEX "story_likes_storyId_idx" ON "story_likes"("storyId");
CREATE INDEX "story_likes_branchId_idx" ON "story_likes"("branchId");

-- Create indexes for comments
CREATE INDEX "comments_storyId_createdAt_idx" ON "comments"("storyId", "createdAt");
CREATE INDEX "comments_branchId_createdAt_idx" ON "comments"("branchId", "createdAt");
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- Create indexes for comment_likes
CREATE UNIQUE INDEX "comment_likes_userId_commentId_key" ON "comment_likes"("userId", "commentId");
CREATE INDEX "comment_likes_commentId_idx" ON "comment_likes"("commentId");

-- Add foreign keys for story_likes
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "story_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for comments
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "story_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for comment_likes
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
