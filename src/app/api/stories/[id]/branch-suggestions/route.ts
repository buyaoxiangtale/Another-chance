import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { callAIText, extractJsonFromAI } from '@/lib/ai-client';
import { characterManager } from '@/lib/character-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ suggestions: [] });
    }

    const { id: storyId } = params;
    const { segmentId, branchId } = await request.json();
    if (!storyId || !segmentId) {
      return NextResponse.json({ suggestions: [] });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || !canViewStory(story, userId)) {
      return NextResponse.json({ suggestions: [] });
    }

    // 获取最近段落作为上下文
    const effectiveBranchId = branchId || 'main';
    const chain = await getOrderedChain(storyId, effectiveBranchId);
    const recentSegments = chain.slice(-3);
    const contextText = recentSegments
      .map(s => s.content?.slice(0, 300) || '')
      .filter(Boolean)
      .join('\n---\n');

    // 获取角色列表
    let characters: Array<{ name: string; role: string; coreMotivation?: string }> = [];
    try {
      characters = (await characterManager.list(storyId)).map(c => ({
        name: c.name,
        role: c.role,
        coreMotivation: c.coreMotivation,
      }));
    } catch {
      // 角色获取失败不阻塞
    }

    const characterText = characters
      .slice(0, 5)
      .map(c => `${c.name}（${c.role}）${c.coreMotivation ? '：' + c.coreMotivation : ''}`)
      .join('\n');

    const systemPrompt = `你是一位专业的文学顾问。根据给定的故事上下文，生成4个不同的故事分叉方向建议。
每个建议必须是一个JSON对象，包含三个字段：icon（一个emoji表情）、label（简短标题，2-8个字）、desc（一句话描述，10-30个字）。
要求：
1. 四个方向应该覆盖不同类型的剧情发展（如：行动、反转、合作、探索）
2. 方向应该与故事体裁和当前情节紧密相关
3. 尽量使用已有角色的名字
4. 输出纯JSON数组，不要添加markdown代码块标记`;

    const userPrompt = `故事标题：${story.title}
故事类型：${story.genre || '未指定'}
故事背景：${(story.description || '').slice(0, 200)}

最近剧情：
${contextText || '（暂无）'}

主要角色：
${characterText || '（暂无）'}

请生成4个故事分叉方向建议。输出格式：
[{"icon":"emoji","label":"标题","desc":"描述"}]`;

    const aiResult = await callAIText(userPrompt, {
      systemPrompt,
      maxTokens: 800,
      priority: 'low',
    });

    const parsed = extractJsonFromAI<Array<{ icon?: string; label?: string; desc?: string }>>(aiResult);
    if (!Array.isArray(parsed) || parsed.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = parsed
      .filter(item => item.icon && item.label && item.desc)
      .slice(0, 4)
      .map(item => ({
        icon: String(item.icon).slice(0, 4),
        label: String(item.label).slice(0, 20),
        desc: String(item.desc).slice(0, 50),
      }));

    if (suggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
