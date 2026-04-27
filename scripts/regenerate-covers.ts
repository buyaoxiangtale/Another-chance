/**
 * 为所有没有封面图的故事补生成封面
 * 用法: npx tsx scripts/regenerate-covers.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
// 加载 .env.local（Next.js 项目的环境变量文件）
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { generateCoverImage } from '../src/lib/cover-generator';

const prisma = new PrismaClient();

async function main() {
  const stories = await prisma.story.findMany({
    where: { coverImageUrl: null },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`找到 ${stories.length} 个没有封面图的故事`);

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    console.log(`[${i + 1}/${stories.length}] 正在为「${s.title}」生成封面...`);

    try {
      const result = await generateCoverImage(s.id);
      if (result.success) {
        console.log(`  成功: ${result.coverImageUrl}`);
      } else {
        console.log(`  失败: ${result.error}`);
      }
    } catch (e: any) {
      console.log(`  异常: ${e.message}`);
    }
  }

  console.log('全部完成');
  await prisma.$disconnect();
}

main();
