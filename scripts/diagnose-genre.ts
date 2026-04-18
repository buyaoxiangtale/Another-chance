/**
 * Prompt 分类诊断脚本
 *
 * 使用 genre-config 共享模块，输出每个故事进入的风格分支
 * 用法：npx tsx scripts/diagnose-genre.ts
 */

import { INFER_PATTERNS, FICTION_KEYWORDS, classifyGenre } from '../src/lib/genre-config';

type StoryLike = {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  era?: string;
};

// ─── 主逻辑 ───

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const storiesPath = path.join(process.cwd(), 'data', 'stories.json');
  const stories: StoryLike[] = JSON.parse(fs.readFileSync(storiesPath, 'utf-8'));

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Prompt Genre Classification Diagnostic               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log();

  let hasIssue = false;

  for (const story of stories) {
    const result = classifyGenre(story.genre || '', story.description || '');
    const isCorrect = verifyResult(story, result);

    const styleInstruction = result.isFiction
      ? '现代白话文（可适度古风词汇）'
      : '半文半白古风文体';

    console.log(`━━━ ${story.title} ━━━`);
    console.log(`  ID:          ${story.id}`);
    console.log(`  Description: ${story.description?.slice(0, 60)}${(story.description?.length ?? 0) > 60 ? '...' : ''}`);
    console.log(`  rawGenre:    "${result.rawGenre}"`);
    console.log(`  推断genre:   "${result.inferredGenre}"${result.matchedKeyword ? ` (匹配关键词: "${result.matchedKeyword}")` : ''}`);
    console.log(`  effective:   "${result.effectiveGenre}"`);
    console.log(`  isFiction:   ${result.isFiction}`);
    console.log(`  → 风格分支:  ${styleInstruction}`);
    if (!isCorrect) {
      hasIssue = true;
      console.log(`  ⚠️  分类可能有误！`);
    }
    console.log();
  }

  // ─── 汇总 ───
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('覆盖的 genre 类型:', Object.keys(INFER_PATTERNS).join(', '));
  console.log('fictionKeywords:   ', FICTION_KEYWORDS.join(', '));
  console.log();

  if (hasIssue) {
    console.log('🔴 发现分类异常！以下故事可能进入错误的风格分支：');
    for (const story of stories) {
      const result = classifyGenre(story.genre || '', story.description || '');
      if (!verifyResult(story, result)) {
        console.log(`   - "${story.title}" → 半文半白古风文体 (应为: 现代白话文)`);
      }
    }
  } else {
    console.log('🟢 所有故事分类正确');
  }
}

/** 验证：科幻类故事应为 isFiction */
function verifyResult(story: StoryLike, result: ReturnType<typeof classifyGenre>): boolean {
  const sciFiKeywords = ['三体', '叶文洁', '红岸', '智子', '面壁者', '黑暗森林',
    '科幻', '外星', '太空', '星际', '未来', '人工智能', '机器人', '赛博'];

  if (sciFiKeywords.some(k => (story.description || '').includes(k) || (story.title || '').includes(k))) {
    return result.isFiction === true;
  }
  return true;
}

main().catch(console.error);
