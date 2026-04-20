import type { Story, StoryBranch, StorySegment, Visibility, User } from "@/lib/prisma";

// --- Permission types ---

interface Ownable {
  ownerId: string | null;
  visibility: Visibility;
}

// --- Story permissions ---

export function canViewStory(story: Ownable, userId?: string): boolean {
  if (story.visibility === "PUBLIC") return true;
  if (story.visibility === "UNLISTED") return true; // anyone with link
  // PRIVATE: only owner
  return !!userId && story.ownerId === userId;
}

export function canEditStory(story: Ownable, userId?: string): boolean {
  return !!userId && story.ownerId === userId;
}

export function canDeleteStory(story: Ownable, user?: { id: string; isAdmin: boolean } | null): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return story.ownerId === user.id;
}

export function canPublishStory(story: Ownable, userId?: string): boolean {
  return !!userId && story.ownerId === userId;
}

// --- Branch permissions ---

export function canViewBranch(
  branch: Ownable,
  parentStory: Ownable,
  userId?: string,
): boolean {
  // Can't view branch if you can't view parent story
  if (!canViewStory(parentStory, userId)) return false;

  if (branch.visibility === "PUBLIC") return true;
  if (branch.visibility === "UNLISTED") return true;
  // PRIVATE: owner only
  return !!userId && branch.ownerId === userId;
}

export function canCreateBranch(parentStory: Ownable, userId?: string): boolean {
  if (!userId) return false;
  // Must be able to view story to branch from it
  return canViewStory(parentStory, userId);
}

export function canEditBranch(branch: Ownable, userId?: string): boolean {
  return !!userId && branch.ownerId === userId;
}

export function canPublishBranch(
  branch: Ownable,
  parentStory: Ownable,
  userId?: string,
): boolean {
  if (!userId || branch.ownerId !== userId) return false;
  // Cannot publish branch if parent story is private
  if (parentStory.visibility === "PRIVATE") return false;
  return true;
}

// --- Segment permissions ---

export function canViewSegment(
  segment: { visibility: Visibility },
  branch: Ownable,
  parentStory: Ownable,
  userId?: string,
): boolean {
  // Segment follows branch visibility rules
  // If user can see the branch, they can see segments in it
  return canViewBranch(branch, parentStory, userId);
}

// --- Feed visibility ---

export function isVisibleInFeed(item: Ownable): boolean {
  return item.visibility === "PUBLIC";
}

// --- Ownership check ---

export function isOwner(item: Ownable, userId?: string): boolean {
  return !!userId && item.ownerId === userId;
}
