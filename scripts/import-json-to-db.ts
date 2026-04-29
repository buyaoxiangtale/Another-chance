/**
 * 将 data/ 目录下的 JSON 数据导入到 PostgreSQL
 * 用法: npx tsx scripts/import-json-to-db.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function loadJSON<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return [];
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYSTEM_USER_ID = "system";

async function main() {
  console.log("开始导入 JSON 数据到 PostgreSQL...");

  // 1. 确保 system 用户存在
  const systemUser = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });
  if (!systemUser) {
    console.error("  [ERROR] system 用户不存在，请先运行 seed");
    process.exit(1);
  }

  // 2. 导入故事
  const stories = loadJSON<any>("stories.json");
  console.log(`  导入 ${stories.length} 个故事...`);
  let storyCount = 0;
  for (const s of stories) {
    try {
      await prisma.story.upsert({
        where: { id: s.id },
        update: {
          title: s.title,
          description: s.description || "",
          author: s.author || "佚名",
          era: s.era || null,
          genre: s.genre || null,
          visibility: "PUBLIC",
          ownerId: SYSTEM_USER_ID,
          ...(s.rootSegmentId ? { rootSegmentId: null } : {}), // 先不设，后面更新
          ...(s.createdAt ? { createdAt: new Date(s.createdAt) } : {}),
          ...(s.updatedAt ? { updatedAt: new Date(s.updatedAt) } : {}),
        },
        create: {
          id: s.id,
          title: s.title,
          description: s.description || "",
          author: s.author || "佚名",
          era: s.era || null,
          genre: s.genre || null,
          storyType: s.storyType || null,
          visibility: "PUBLIC",
          ownerId: SYSTEM_USER_ID,
          ...(s.createdAt ? { createdAt: new Date(s.createdAt) } : {}),
          ...(s.updatedAt ? { updatedAt: new Date(s.updatedAt) } : {}),
        },
      });
      storyCount++;
    } catch (e) {
      console.warn(`    [WARN] 故事 "${s.title}" 导入失败:`, (e as Error).message);
    }
  }
  console.log(`  [OK] ${storyCount}/${stories.length} 个故事已导入`);

  // 3. 导入段落
  const segments = loadJSON<any>("segments.json");
  console.log(`  导入 ${segments.length} 个段落...`);
  let segCount = 0;
  for (const seg of segments) {
    try {
      // 检查 storyId 是否存在
      const storyExists = await prisma.story.findUnique({ where: { id: seg.storyId } });
      if (!storyExists) {
        console.warn(`    [SKIP] 段落 ${seg.id} 引用的故事 ${seg.storyId} 不存在`);
        continue;
      }

      await prisma.storySegment.upsert({
        where: { id: seg.id },
        update: {
          title: seg.title || null,
          content: seg.content || "",
          isBranchPoint: seg.isBranchPoint || false,
          branchId: seg.branchId || "main",
          parentSegmentId: seg.parentSegmentId || null,
          imageUrls: seg.imageUrls || [],
          timeline: seg.timeline || undefined,
          historicalReferences: seg.historicalReferences || undefined,
          narrativePace: seg.narrativePace || null,
          mood: seg.mood || null,
          characterIds: seg.characterIds || [],
          visibility: "PUBLIC",
          ...(seg.createdAt ? { createdAt: new Date(seg.createdAt) } : {}),
          ...(seg.updatedAt ? { updatedAt: new Date(seg.updatedAt) } : {}),
        },
        create: {
          id: seg.id,
          title: seg.title || null,
          content: seg.content || "",
          isBranchPoint: seg.isBranchPoint || false,
          branchId: seg.branchId || "main",
          parentSegmentId: seg.parentSegmentId || null,
          imageUrls: seg.imageUrls || [],
          timeline: seg.timeline || undefined,
          historicalReferences: seg.historicalReferences || undefined,
          narrativePace: seg.narrativePace || null,
          mood: seg.mood || null,
          characterIds: seg.characterIds || [],
          visibility: "PUBLIC",
          storyId: seg.storyId,
          ...(seg.createdAt ? { createdAt: new Date(seg.createdAt) } : {}),
          ...(seg.updatedAt ? { updatedAt: new Date(seg.updatedAt) } : {}),
        },
      });
      segCount++;
    } catch (e) {
      console.warn(`    [WARN] 段落 ${seg.id} 导入失败:`, (e as Error).message);
    }
  }
  console.log(`  [OK] ${segCount}/${segments.length} 个段落已导入`);

  // 4. 更新故事的 rootSegmentId
  console.log("  更新故事的 rootSegmentId...");
  for (const s of stories) {
    if (s.rootSegmentId) {
      try {
        const segExists = await prisma.storySegment.findUnique({ where: { id: s.rootSegmentId } });
        if (segExists) {
          await prisma.story.update({
            where: { id: s.id },
            data: { rootSegmentId: s.rootSegmentId },
          });
        }
      } catch (e) {
        console.warn(`    [WARN] 故事 ${s.id} rootSegmentId 更新失败:`, (e as Error).message);
      }
    }
  }
  console.log("  [OK] rootSegmentId 已更新");

  // 5. 导入分支
  const branches = loadJSON<any>("branches.json");
  console.log(`  导入 ${branches.length} 个分支...`);
  let branchCount = 0;
  for (const b of branches) {
    try {
      const storyExists = await prisma.story.findUnique({ where: { id: b.storyId } });
      if (!storyExists) {
        console.warn(`    [SKIP] 分支 ${b.id} 引用的故事 ${b.storyId} 不存在`);
        continue;
      }
      const segExists = await prisma.storySegment.findUnique({ where: { id: b.sourceSegmentId } });
      if (!segExists) {
        console.warn(`    [SKIP] 分支 ${b.id} 引用的源段落 ${b.sourceSegmentId} 不存在`);
        continue;
      }

      await prisma.storyBranch.upsert({
        where: { id: b.id },
        update: {
          title: b.title,
          description: b.description || null,
          userDirection: b.userDirection || "",
          characterStateSnapshot: b.characterStateSnapshot || undefined,
          forkTimeline: b.forkTimeline || undefined,
          visibility: "PUBLIC",
          ownerId: SYSTEM_USER_ID,
          ...(b.createdAt ? { createdAt: new Date(b.createdAt) } : {}),
          ...(b.updatedAt ? { updatedAt: new Date(b.updatedAt) } : {}),
        },
        create: {
          id: b.id,
          title: b.title,
          description: b.description || null,
          sourceSegmentId: b.sourceSegmentId,
          storyId: b.storyId,
          userDirection: b.userDirection || "",
          characterStateSnapshot: b.characterStateSnapshot || undefined,
          forkTimeline: b.forkTimeline || undefined,
          visibility: "PUBLIC",
          ownerId: SYSTEM_USER_ID,
          ...(b.createdAt ? { createdAt: new Date(b.createdAt) } : {}),
          ...(b.updatedAt ? { updatedAt: new Date(b.updatedAt) } : {}),
        },
      });
      branchCount++;
    } catch (e) {
      console.warn(`    [WARN] 分支 ${b.id} "${b.title}" 导入失败:`, (e as Error).message);
    }
  }
  console.log(`  [OK] ${branchCount}/${branches.length} 个分支已导入`);

  // 6. 导入角色（通过 stories.json 的 characterIds 反查 storyId）
  const characters = loadJSON<any>("characters.json");
  // 构建 characterId -> storyId 映射
  const charStoryMap = new Map<string, string>();
  for (const s of stories) {
    if (Array.isArray(s.characterIds)) {
      for (const cid of s.characterIds) {
        charStoryMap.set(cid, s.id);
      }
    }
  }
  console.log(`  导入 ${characters.length} 个角色...`);
  let charCount = 0;
  for (const c of characters) {
    try {
      const storyId = c.storyId || charStoryMap.get(c.id);
      if (!storyId) {
        console.warn(`    [SKIP] 角色 ${c.id} "${c.name}" 无法确定所属故事`);
        continue;
      }
      const storyExists = await prisma.story.findUnique({ where: { id: storyId } });
      if (!storyExists) {
        console.warn(`    [SKIP] 角色 ${c.id} 引用的故事 ${storyId} 不存在`);
        continue;
      }

      await prisma.character.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          era: c.era || "",
          role: c.role || "supporting",
          speechPatterns: c.speechPatterns || "",
          coreMotivation: c.coreMotivation || "",
          traits: c.traits || [],
          relationships: c.relationships || [],
          stateHistory: c.stateHistory || [],
          appearance: c.appearance || "",
          canonicalName: c.canonicalName || "",
        },
        create: {
          id: c.id,
          name: c.name,
          era: c.era || "",
          role: c.role || "supporting",
          speechPatterns: c.speechPatterns || "",
          coreMotivation: c.coreMotivation || "",
          traits: c.traits || [],
          relationships: c.relationships || [],
          stateHistory: c.stateHistory || [],
          appearance: c.appearance || "",
          canonicalName: c.canonicalName || "",
          storyId,
        },
      });
      charCount++;
    } catch (e) {
      console.warn(`    [WARN] 角色 ${c.id} "${c.name}" 导入失败:`, (e as Error).message);
    }
  }
  console.log(`  [OK] ${charCount}/${characters.length} 个角色已导入`);

  console.log("\n导入完成！");
}

main()
  .catch((e) => {
    console.error("导入失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
