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

async function validate() {
  let errors = 0;

  // Count validation
  const oldStories = loadJSON<any>("stories.json");
  const oldSegments = loadJSON<any>("segments.json");
  const oldBranches = loadJSON<any>("branches.json");

  const pgStories = await prisma.story.count();
  const pgSegments = await prisma.storySegment.count();
  const pgBranches = await prisma.storyBranch.count();

  console.log("=== Count Validation ===");
  console.log(`Stories: JSON=${oldStories.length}, PG=${pgStories}`);
  console.log(`Segments: JSON=${oldSegments.length}, PG=${pgSegments}`);
  console.log(`Branches: JSON=${oldBranches.length}, PG=${pgBranches}`);

  if (pgStories !== oldStories.length) { console.error("ERROR: Story count mismatch"); errors++; }
  if (pgSegments !== oldSegments.length) { console.error("ERROR: Segment count mismatch"); errors++; }
  if (pgBranches !== oldBranches.length) { console.error("ERROR: Branch count mismatch"); errors++; }

  // Segment chain integrity
  console.log("\n=== Segment Chain Validation ===");
  const stories = await prisma.story.findMany({ include: { segments: true } });

  for (const story of stories) {
    const roots = story.segments.filter(s => !s.parentSegmentId && s.branchId === "main");
    if (roots.length === 0) {
      console.error(`ERROR: Story "${story.title}" has no root segment`);
      errors++;
    } else if (roots.length > 1) {
      console.error(`ERROR: Story "${story.title}" has multiple root segments`);
      errors++;
    }

    // Check dangling parentSegmentId
    const segIds = new Set(story.segments.map(s => s.id));
    for (const seg of story.segments) {
      if (seg.parentSegmentId && !segIds.has(seg.parentSegmentId)) {
        // Allow if parent is in another branch (cross-branch reference)
        const parent = await prisma.storySegment.findUnique({ where: { id: seg.parentSegmentId } });
        if (!parent) {
          console.error(`ERROR: Segment ${seg.id} has dangling parentSegmentId: ${seg.parentSegmentId}`);
          errors++;
        }
      }
    }
  }

  // Branch source validation
  console.log("\n=== Branch Source Validation ===");
  const allBranches = await prisma.storyBranch.findMany();
  for (const branch of allBranches) {
    const source = await prisma.storySegment.findUnique({ where: { id: branch.sourceSegmentId } });
    if (!source) {
      console.error(`ERROR: Branch "${branch.title}" has dangling sourceSegmentId: ${branch.sourceSegmentId}`);
      errors++;
    }
  }

  // Visibility check
  const publicStories = await prisma.story.count({ where: { visibility: "PUBLIC" } });
  console.log(`\nPublic stories: ${publicStories} (expected: 0 after migration)`);

  console.log("\n=== Validation Complete ===");
  if (errors === 0) {
    console.log("All checks passed!");
  } else {
    console.error(`${errors} error(s) found!`);
    process.exit(1);
  }
}

validate()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
