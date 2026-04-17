import { NextRequest, NextResponse } from 'next/server';
import {
  storiesStore, segmentsStore, branchesStore,
  charactersStore, historicalReferencesStore, directorStatesStore,
} from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === params.id);

    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, story });
  } catch (error) {
    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
  }
}

/**
 * 更新故事（修改标题、描述、genre 等）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, genre, era, author } = body;

    const stories = await storiesStore.load();
    const idx = stories.findIndex((s: any) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    // 只更新传入的字段
    const allowedFields = ['title', 'description', 'genre', 'era', 'author'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (stories[idx] as any)[field] = body[field];
      }
    }
    (stories[idx] as any).updatedAt = new Date().toISOString();

    await storiesStore.save(stories);
    return NextResponse.json({ success: true, story: stories[idx] });
  } catch (error) {
    console.error('更新故事失败:', error);
    return NextResponse.json({ error: '更新故事失败' }, { status: 500 });
  }
}

/**
 * 删除故事（级联清理所有关联数据）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. 检查故事是否存在
    const stories = await storiesStore.load();
    const idx = stories.findIndex((s: any) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const storyTitle = (stories[idx] as any).title;

    // 2. 获取该故事所有分支
    const branches = await branchesStore.load();
    const branchIds = new Set(
      branches
        .filter((b: any) => b.storyId === id)
        .map((b: any) => b.id)
    );
    branchIds.add('main'); // main 分支也要清理

    // 3. 删除所有关联段落
    const segments = await segmentsStore.load();
    const remainingSegments = segments.filter(
      (s: any) => s.storyId !== id
    );
    const deletedSegmentsCount = segments.length - remainingSegments.length;
    await segmentsStore.save(remainingSegments);

    // 4. 删除所有关联分支
    const remainingBranches = branches.filter(
      (b: any) => b.storyId !== id
    );
    await branchesStore.save(remainingBranches);

    // 5. 删除关联角色
    const characters = await charactersStore.load();
    const remainingCharacters = characters.filter(
      (c: any) => c.storyId !== id
    );
    const deletedCharactersCount = characters.length - remainingCharacters.length;
    await charactersStore.save(remainingCharacters);

    // 6. 删除关联历史引用
    const refs = await historicalReferencesStore.load();
    const remainingRefs = refs.filter(
      (r: any) => r.storyId !== id
    );
    await historicalReferencesStore.save(remainingRefs);

    // 7. 删除导演状态
    const directorStates = await directorStatesStore.load();
    const remainingDirector = directorStates.filter(
      (d: any) => d.storyId !== id
    );
    await directorStatesStore.save(remainingDirector);

    // 8. 删除故事本身
    stories.splice(idx, 1);
    await storiesStore.save(stories);

    return NextResponse.json({
      success: true,
      message: `故事「${storyTitle}」已删除`,
      stats: {
        deletedSegments: deletedSegmentsCount,
        deletedBranches: remainingBranches.length - branches.length + (branches.filter((b: any) => b.storyId === id).length),
        deletedCharacters: deletedCharactersCount,
      }
    });
  } catch (error) {
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: '删除故事失败' }, { status: 500 });
  }
}
