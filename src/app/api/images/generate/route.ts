import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeStoryStyle,
  analyzeSegmentStyle,
  generateImagesForSegment,
  IMAGE_STYLES,
  type ImageStyle,
  type CharacterVisualHint,
} from '@/lib/image-generator';
import prisma from '@/lib/prisma';
import { callAIText } from '@/lib/ai-client';
import { characterManager } from '@/lib/character-engine';
import { directorManager } from '@/lib/director-manager';
import { contextSummarizer } from '@/lib/context-summarizer';
import { getOrderedChain } from '@/lib/chain-helpers';
import { getCachedReferenceImages, searchReferenceImages, type ReferenceImageHint } from '@/lib/reference-image-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentId, segmentContent, style = 'auto', storyContent, maxImages = 3 } = body;

    if (!segmentId || !segmentContent) {
      return NextResponse.json(
        { error: '缺少必要的参数: segmentId 和 segmentContent' },
        { status: 400 }
      );
    }

    // 验证 style 是否合法
    const requestedStyle: ImageStyle = IMAGE_STYLES.find(s => s.value === style)
      ? style as ImageStyle
      : 'auto';

    // 拉取段落所属 story 的 genre / description / storyId，用于 auto 风格选择 + 角色还原
    let genre: string | undefined;
    let storyDescription: string | undefined;
    let storyIdForChars: string | undefined;
    let storyTitleForSeed: string | undefined;
    let storyEraForSeed: string | undefined;
    let branchIdForChain = 'main';
    try {
      const seg = await prisma.storySegment.findUnique({
        where: { id: segmentId },
        select: {
          storyId: true,
          branchId: true,
          story: { select: { genre: true, description: true, era: true, title: true } },
        },
      });
      if (seg?.story) {
        genre = [seg.story.genre, seg.story.era].filter(Boolean).join(' ');
        storyDescription = seg.story.description ?? undefined;
        storyIdForChars = seg.storyId;
        storyTitleForSeed = seg.story.title;
        storyEraForSeed = seg.story.era ?? undefined;
        branchIdForChain = seg.branchId || 'main';
      }
    } catch (e) {
      console.warn('[images/generate] 拉取 story 信息失败:', e);
    }

    // 方案 E：首次生成时，为已知 IP 预播 fandom 角色名册（有 web_search 的 LLM）
    if (storyIdForChars) {
      try {
        await characterManager.seedFandomRoster(storyIdForChars, {
          title: storyTitleForSeed,
          genre,
          storyDescription,
          era: storyEraForSeed,
          callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 1200, webSearch: true }),
        });
      } catch (e) {
        console.warn('[images/generate] seedFandomRoster 失败:', e);
      }
    }

    // D1: 同人 IP 参考图搜索（在 fandom seeding 完成后执行）
    let referenceImageHints: ReferenceImageHint[] = [];
    if (storyIdForChars) {
      try {
        const state = await directorManager.getState(storyIdForChars);
        const wv = (state?.worldVariables as Record<string, any>) || {};
        if (wv.fandom_seeded && wv.fandom_name) {
          const cached = await getCachedReferenceImages(wv.fandom_name);
          if (cached.length > 0) {
            referenceImageHints = cached;
          } else {
            // 异步搜索，不阻塞当前图片生成
            const characterNames = (await characterManager.list(storyIdForChars))
              .map(c => {
                const traits = Array.isArray(c.traits) ? c.traits as string[] : [];
                const canonical = traits.find((t: string) => t.startsWith('canonical:'));
                return canonical ? canonical.slice('canonical:'.length) : c.name;
              })
              .slice(0, 8);

            searchReferenceImages(
              wv.fandom_name,
              wv.fandom_name_en || '',
              characterNames,
            ).catch(e => console.warn('[images/generate] 参考图搜索失败:', e));
          }
        }
      } catch (e) {
        console.warn('[images/generate] 参考图搜索集成失败:', e);
      }
    }

    // 发现并自动注册段落中出现的所有角色（含新角色）
    // 外观存入 Character.traits，下次命中缓存；新角色首次出现时 AI 实时登记
    const characters: CharacterVisualHint[] = [];
    if (storyIdForChars) {
      try {
        const mentioned = await characterManager.discoverAndRegisterCharacters(
          storyIdForChars,
          segmentContent,
          (p: string) => callAIText(p, { maxTokens: 1200 }),
          {
            genre,
            storyDescription,
            // 联网查询分支：GLM 内置 web_search，用来补齐未知角色外观
            callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 1500, webSearch: true }),
          },
        );

        for (const c of mentioned) {
          // Prefer structured fields, fall back to traits prefix matching
          const traits = Array.isArray(c.traits) ? (c.traits as string[]) : [];
          const canonicalName = (c as any).canonicalName
            || traits.find(t => typeof t === 'string' && t.startsWith('canonical:'))?.slice('canonical:'.length);
          const appearance = (c as any).appearance
            || traits.find(t => typeof t === 'string' && t.startsWith('appearance:'))?.slice('appearance:'.length);

          characters.push({
            name: c.name,
            canonicalName,
            appearance,
            role: c.role || undefined,
          });
        }
      } catch (e) {
        console.warn('[images/generate] 角色发现/注册失败:', e);
      }
    }

    // 方案 C：拉取近 N 段摘要，传入图片生成器作为上下文
    // 只在 chain 长度 > 1 时拉（首段无历史上下文，避免无用 LLM 调用）
    let contextSummary: string | undefined;
    if (storyIdForChars) {
      try {
        const chain = await getOrderedChain(storyIdForChars, branchIdForChain);
        if (chain.length > 1) {
          const recent = chain.slice(-6, -1) as any[]; // 取当前段之前的最近 5 段，不包含当前段
          if (recent.length > 0) {
            contextSummary = await contextSummarizer.getContextForPrompt(recent, 1200, genre);
          }
        }
      } catch (e) {
        console.warn('[images/generate] 拉取上下文摘要失败:', e);
      }
    }

    // 场景状态已由续写路由 await 写入，直接读取即可
    let sceneStateEn: string | undefined;
    if (storyIdForChars) {
      try {
        sceneStateEn = await directorManager.getSceneStatePromptEnglish(storyIdForChars);
      } catch (e) {
        console.warn('[images/generate] 读取场景状态失败:', e);
      }
    }

    // 方案 B：基于角色名 + 段落 ID 派生 seed，保证角色面部一致的同时跨段构图多样
    let seed: number | undefined;
    if (characters.length > 0) {
      const charKey = characters.map(c => c.canonicalName || c.name).sort().join('|');
      // Incorporate segmentId so different segments get different seeds even with same characters
      const key = `${charKey}|${segmentId}`;
      let h = 2166136261;
      for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      seed = Math.abs(h) % 2147483647;
    }

    // 确定使用的风格：显式传入 > 自动分析
    let styleUsed: ImageStyle;
    let styleReason = '';

    if (requestedStyle !== 'auto') {
      styleUsed = requestedStyle;
      styleReason = '用户手动选择';
    } else {
      const storyStyleAnalysis = typeof storyContent === 'string' && storyContent.trim()
        ? analyzeStoryStyle(storyContent.slice(0, 2000))
        : undefined;
      const result = analyzeSegmentStyle(segmentContent, {
        storyStyle: storyStyleAnalysis && storyStyleAnalysis.confidence >= 0.5
          ? storyStyleAnalysis.recommendedStyle
          : undefined,
        genre,
        storyDescription,
      });
      styleUsed = result.style;
      styleReason =
        (!result.isAutoOverride && storyStyleAnalysis && storyStyleAnalysis.confidence >= 0.5
          ? storyStyleAnalysis.reason
          : result.reason) + (result.isAutoOverride ? '（段落级覆盖）' : '');
    }
    const images = await generateImagesForSegment({
      segmentId,
      segmentContent,
      style: styleUsed,
      maxImages,
      genre,
      storyDescription,
      characters,
      contextSummary,
      sceneStateEn,
      seed,
      referenceImages: referenceImageHints.length > 0 ? referenceImageHints : undefined,
      callAIFn: (p: string) => callAIText(p, { maxTokens: 4000 }),
    });

    // 更新段落的 imageUrls 到数据库（替换旧图，只保留最新一次生成的插图）
    if (images.length > 0) {
      try {
        const newUrls = images.map(img => img.url);
        await prisma.storySegment.update({
          where: { id: segmentId },
          data: { imageUrls: newUrls },
        });
      } catch (e) {
        console.warn('[images/generate] 更新段落 imageUrls 失败:', e);
      }
    }

    return NextResponse.json({
      success: true,
      segmentId,
      styleUsed,
      styleReason,
      images: images.map((img, i) => ({
        id: `img_${segmentId}_${i}`,
        url: img.url,
        description: img.description,
        type: img.type,
        width: 1024,
        height: 1024,
        alt: img.description,
      })),
      totalCount: images.length,
    });
  } catch (error) {
    console.error('图片生成失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '图片生成失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({
    allowedMethods: ['POST'],
    supportedStyles: IMAGE_STYLES.map(s => ({ value: s.value, label: s.label })),
  });
}
