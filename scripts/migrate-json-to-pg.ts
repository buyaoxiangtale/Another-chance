import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATA_DIR = path.join(process.cwd(), "data");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function loadJSON<T>(filename: string): T[] {
  const fp = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

interface LegacyStory {
  id: string; title: string; description?: string; author?: string;
  createdAt: string; updatedAt: string; rootSegmentId?: string;
  era?: string; genre?: string; characterIds?: string[];
}

interface LegacySegment {
  id: string; title?: string; content: string; isBranchPoint: boolean;
  createdAt: string; updatedAt: string; storyId: string; branchId: string;
  parentSegmentId?: string; imageUrls: string[];
  timeline?: any; characterIds?: string[]; historicalReferences?: any[];
  narrativePace?: string; mood?: string;
}

interface LegacyBranch {
  id: string; title: string; description?: string; sourceSegmentId: string;
  storyId: string; userDirection: string; createdAt: string; updatedAt: string;
  characterStateSnapshot?: any; forkTimeline?: any;
}

async function main() {
  console.log("Starting JSON → PostgreSQL migration...");

  // 0. Ensure system user
  await prisma.user.upsert({
    where: { id: "system" },
    update: {},
    create: {
      id: "system",
      email: "system@localhost",
      name: "System",
      passwordHash: "$2a$12$placeholder",
      isAdmin: true,
    },
  });

  // 1. Migrate Stories
  const stories = loadJSON<LegacyStory>("stories.json");
  console.log(`Migrating ${stories.length} stories...`);

  for (const s of stories) {
    await prisma.story.create({
      data: {
        id: s.id,
        title: s.title,
        description: s.description,
        author: s.author || "佚名",
        era: s.era,
        genre: s.genre,
        ownerId: "system",
        visibility: "PRIVATE",
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    }).catch((e: any) => {
      console.warn(`  SKIP story ${s.id}: ${e.message}`);
    });
  }

  // 2. Migrate Segments
  const segments = loadJSON<LegacySegment>("segments.json");
  console.log(`Migrating ${segments.length} segments...`);

  for (const seg of segments) {
    await prisma.storySegment.create({
      data: {
        id: seg.id,
        title: seg.title,
        content: seg.content,
        isBranchPoint: seg.isBranchPoint,
        storyId: seg.storyId,
        branchId: seg.branchId,
        parentSegmentId: seg.parentSegmentId || null,
        imageUrls: seg.imageUrls || [],
        timeline: seg.timeline || undefined,
        historicalReferences: seg.historicalReferences || undefined,
        narrativePace: seg.narrativePace,
        mood: seg.mood,
        characterIds: seg.characterIds || [],
        visibility: "PRIVATE",
        createdAt: new Date(seg.createdAt),
        updatedAt: new Date(seg.updatedAt),
      },
    }).catch((e: any) => {
      console.warn(`  SKIP segment ${seg.id}: ${e.message}`);
    });
  }

  // 3. Update Story rootSegmentId
  for (const s of stories) {
    if (s.rootSegmentId) {
      await prisma.story.update({
        where: { id: s.id },
        data: { rootSegmentId: s.rootSegmentId },
      }).catch(() => {});
    }
  }

  // 4. Migrate Branches
  const branches = loadJSON<LegacyBranch>("branches.json");
  console.log(`Migrating ${branches.length} branches...`);

  for (const b of branches) {
    await prisma.storyBranch.create({
      data: {
        id: b.id,
        title: b.title,
        description: b.description,
        sourceSegmentId: b.sourceSegmentId,
        storyId: b.storyId,
        userDirection: b.userDirection,
        characterStateSnapshot: b.characterStateSnapshot || undefined,
        forkTimeline: b.forkTimeline || undefined,
        ownerId: "system",
        visibility: "PRIVATE",
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      },
    }).catch((e: any) => {
      console.warn(`  SKIP branch ${b.id}: ${e.message}`);
    });
  }

  // 5. Migrate Characters
  const characters = loadJSON<any>("characters.json");
  let charCount = 0;
  for (const c of characters) {
    if (!c.storyId) continue;
    await prisma.character.create({
      data: {
        id: c.id,
        name: c.name,
        era: c.era || "",
        role: c.role || "supporting",
        traits: c.traits || [],
        speechPatterns: c.speechPatterns || "",
        relationships: c.relationships || [],
        stateHistory: c.stateHistory || [],
        coreMotivation: c.coreMotivation || "",
        storyId: c.storyId,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      },
    }).catch(() => {});
    charCount++;
  }
  console.log(`Migrated ${charCount} characters`);

  console.log("Migration complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
