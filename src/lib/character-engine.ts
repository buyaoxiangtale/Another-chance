import type { Character as PrismaCharacter, StorySegment as PrismaSegment, StoryBranch as PrismaBranch } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { getOrderedChain } from '@/lib/chain-helpers';
import { hasExplicitWebSearch, webSearch, formatSearchResultsForPrompt } from '@/lib/web-search';
import { extractJsonFromAI } from './ai-client';

type StorySegment = PrismaSegment;
type Character = PrismaCharacter;

// Generate unique ID
function genId(): string {
  return 'char_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class CharacterManager {
  // === CRUD ===

  async list(storyId?: string): Promise<Character[]> {
    if (storyId) {
      return prisma.character.findMany({ where: { storyId } });
    }
    return prisma.character.findMany();
  }

  async getById(id: string): Promise<Character | null> {
    return prisma.character.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    era?: string;
    role?: string;
    traits?: string[];
    speechPatterns?: string;
    relationships?: any[];
    stateHistory?: any[];
    coreMotivation?: string;
    storyId: string;
    appearance?: string;
    canonicalName?: string;
  }): Promise<Character> {
    // Extract appearance/canonicalName from traits prefix format if not explicitly provided
    const traitsArr = data.traits || [];
    const appearanceFromTraits = traitsArr.find((t: string) => typeof t === 'string' && t.startsWith('appearance:'))?.slice('appearance:'.length);
    const canonicalFromTraits = traitsArr.find((t: string) => typeof t === 'string' && t.startsWith('canonical:'))?.slice('canonical:'.length);

    return prisma.character.create({
      data: {
        id: genId(),
        name: data.name,
        era: data.era || '',
        role: data.role || 'supporting',
        traits: traitsArr,
        speechPatterns: data.speechPatterns || '',
        relationships: data.relationships || [],
        stateHistory: data.stateHistory || [],
        coreMotivation: data.coreMotivation || '',
        storyId: data.storyId,
        appearance: data.appearance || appearanceFromTraits || '',
        canonicalName: data.canonicalName || canonicalFromTraits || '',
      },
    });
  }

  async update(id: string, updates: Partial<Character>): Promise<Character | null> {
    try {
      const { id: _id, createdAt: _ca, storyId: _sid, ...safeUpdates } = updates as any;
      return await prisma.character.update({
        where: { id },
        data: { ...safeUpdates, updatedAt: new Date() },
      });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.character.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // === Character context for a segment ===
  async getCharacterContext(storyId: string, branchId: string, segmentId: string) {
    const characters = await this.list(storyId);
    const chain = await getOrderedChain(storyId, branchId);
    const segIdx = chain.findIndex(s => s.id === segmentId);

    const involvedIds = new Set<string>();
    for (let i = 0; i <= segIdx && i < chain.length; i++) {
      if ((chain[i] as any).characterIds) {
        ((chain[i] as any).characterIds as string[]).forEach(id => involvedIds.add(id));
      }
    }

    // 如果 segment 链中没有记录 characterIds（旧数据或发现失败），回退为展示全部角色
    const activeCharacters = involvedIds.size > 0
      ? characters.filter(c => involvedIds.has(c.id))
      : characters;
    return {
      activeCharacters,
      segmentId,
      totalCharacters: characters.length,
      activeCount: activeCharacters.length,
    };
  }

  // === Update character state ===
  async updateCharacterState(characterId: string, segmentId: string, newState: string): Promise<Character | null> {
    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) return null;

    const stateHistory: any[] = Array.isArray(char.stateHistory) ? [...char.stateHistory] : [];
    const existingIdx = stateHistory.findIndex((e: any) => e.segmentId === segmentId);
    const entry = { segmentId, state: newState };
    if (existingIdx >= 0) {
      stateHistory[existingIdx] = entry;
    } else {
      stateHistory.push(entry);
    }

    return prisma.character.update({
      where: { id: characterId },
      data: { stateHistory, updatedAt: new Date() },
    });
  }

  // === Relationship graph ===
  async getRelationshipGraph(storyId: string, branchId: string) {
    const characters = await this.list(storyId);
    const nodes = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
    }));

    const edges: Array<{ source: string; target: string; relation: string; strength: number }> = [];
    for (const c of characters) {
      const relationships = Array.isArray(c.relationships) ? c.relationships : [];
      for (const rel of relationships) {
        const r = rel as any;
        if (characters.some(t => t.id === r.targetId)) {
          edges.push({
            source: c.id,
            target: r.targetId,
            relation: r.relation,
            strength: r.strength,
          });
        }
      }
    }

    return { nodes, edges };
  }

  // === Build character AI prompt ===
  async buildCharacterPrompt(characterIds: string[], segmentChain?: any[]): Promise<string> {
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
    });

    if (characters.length === 0) return '';

    const lines: string[] = ['【角色信息】'];

    for (const c of characters) {
      lines.push(`## ${c.name}（${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '对手' : c.role === 'supporting' ? '配角' : '旁白'}）`);
      lines.push(`时代：${c.era}`);
      const traits = Array.isArray(c.traits) ? (c.traits as string[]) : [];
      if (traits.length > 0) {
        lines.push(`性格特征：${traits.join('、')}`);
      }
      if (c.coreMotivation) {
        lines.push(`核心动机：${c.coreMotivation}`);
      }
      if (c.speechPatterns) {
        lines.push(`语言风格：${c.speechPatterns}`);
      }
      const stateHistory = Array.isArray(c.stateHistory) ? c.stateHistory : [];
      if (stateHistory.length > 0) {
        const latestState = stateHistory[stateHistory.length - 1] as any;
        lines.push(`当前状态：${latestState.state}`);
      }
      const relationships = Array.isArray(c.relationships) ? c.relationships : [];
      if (relationships.length > 0) {
        const relStr = relationships.map((r: any) => {
          const target = characters.find(t => t.id === r.targetId);
          return `${target?.name || r.targetId}（${r.relation}，亲密度${Math.round(r.strength * 100)}%）`;
        }).join('；');
        lines.push(`人物关系：${relStr}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // === Snapshot character states at branch point ===
  async snapshotCharacterStates(storyId: string, branchId: string, segmentId: string): Promise<Record<string, string>> {
    const characters = await this.list(storyId);
    const snapshot: Record<string, string> = {};

    for (const c of characters) {
      const stateHistory = Array.isArray(c.stateHistory) ? c.stateHistory : [];
      if (stateHistory.length > 0) {
        snapshot[c.id] = (stateHistory[stateHistory.length - 1] as any).state;
      } else {
        snapshot[c.id] = '正常';
      }
    }

    // Save to branch's characterStateSnapshot
    try {
      await prisma.storyBranch.update({
        where: { id: branchId },
        data: { characterStateSnapshot: snapshot },
      });
    } catch {}

    return snapshot;
  }

  // === Restore character states ===
  async restoreCharacterStates(snapshot: Record<string, string>): Promise<void> {
    for (const [charId, state] of Object.entries(snapshot)) {
      const char = await prisma.character.findUnique({ where: { id: charId } });
      if (!char) continue;

      const stateHistory: any[] = Array.isArray(char.stateHistory) ? [...char.stateHistory] : [];
      const existingIdx = stateHistory.findIndex((e: any) => e.segmentId === '__restored__');
      const entry = { segmentId: '__restored__', state };
      if (existingIdx >= 0) {
        stateHistory[existingIdx] = entry;
      } else {
        stateHistory.push(entry);
      }

      await prisma.character.update({
        where: { id: charId },
        data: { stateHistory, updatedAt: new Date() },
      });
    }
  }

  /**
   * E. 冷启动"名人池"预种子。
   *
   * 故事一开始还没写角色描述时，单靠段落信息无法正确画出已知 IP 人物。
   * 本方法在故事首次生成图时调用一次：
   *   1. 判断故事是否属于"已知 IP"（同人、历史名著、名作小说等）
   *   2. 若是，请求联网 LLM 一次性给出该作品的前 N 个主要角色 + 标准外观
   *   3. 批量写入 Character 表（appearance / canonical 以前缀形式存入 traits）
   *   4. 在 DirectorState.worldVariables.fandom_seeded 打标记，避免重复 seed
   *
   * 任何一步失败都静默降级，绝不抛异常。
   */
  async seedFandomRoster(
    storyId: string,
    ctx: {
      title?: string;
      genre?: string;
      storyDescription?: string;
      era?: string;
      /** 联网 LLM 调用函数（推荐启用 web_search） */
      callAIWithWebSearchFn: (prompt: string) => Promise<string>;
    },
  ): Promise<{ seeded: boolean; created: Character[] }> {
    const { directorManager } = await import('./director-manager');

    const state = await directorManager.getOrCreate(storyId);
    const flags = (state.worldVariables as Record<string, any>) || {};
    if (flags.fandom_seeded) {
      return { seeded: true, created: [] };
    }

    // Step 1: 用 LLM 判断是否已知 IP，若是给出 fandomName（英文 / 原文）
    const detectPrompt = `你是文学百科助手。根据下面信息判断：这篇故事是否是一部已知作品（动漫/漫画/小说/游戏/影视/历史名著）的同人或改编？

标题：${ctx.title || ''}
类型：${ctx.genre || ''}
时代：${ctx.era || ''}
简介：${(ctx.storyDescription || '').slice(0, 400)}

严格输出 JSON（不要 markdown、不要说明）：
{"isFandom": true | false, "fandomName": "作品规范中文名", "fandomNameEn": "英文/原文名", "confidence": 0.0-1.0}
confidence < 0.6 时，isFandom 必须为 false。`;

    let fandomName = '';
    let fandomNameEn = '';
    try {
      const raw = await ctx.callAIWithWebSearchFn(detectPrompt);
      const parsed = extractJsonFromAI<{ isFandom?: boolean; fandomName?: string; fandomNameEn?: string; confidence?: number }>(raw);
      if (!parsed) return { seeded: false, created: [] };
      if (!parsed.isFandom || (parsed.confidence ?? 0) < 0.6) {
        // 非 IP：仍标记已处理，避免每次都跑 detect
        await directorManager.updateState(storyId, {
          worldVariables: { ...flags, fandom_seeded: true, fandom_name: '' },
        });
        return { seeded: false, created: [] };
      }
      fandomName = (parsed.fandomName || '').slice(0, 80);
      fandomNameEn = (parsed.fandomNameEn || '').slice(0, 80);
    } catch (e) {
      console.warn('[character-engine] fandom 判定失败:', e);
      return { seeded: false, created: [] };
    }

    // Step 2: 拉取该作品的前 N 个主要角色
    const rosterPrompt = `你是《${fandomName}${fandomNameEn ? ' / ' + fandomNameEn : ''}》的百科助手。
请列出该作品中最重要、登场最频繁的 10-15 个角色。

严格输出 JSON 数组（不要 markdown、不要说明文字）。每个元素字段：
{
  "name": "中文名（最常用的那一个）",
  "canonicalName": "英文/罗马音规范名（最多 40 字符）",
  "era": "角色所处时代/世界背景简述（中文，一句话）",
  "role": "protagonist | antagonist | supporting | narrator",
  "appearance": "纯英文 1-2 句，包含年龄段、发型、发色、眼睛、服装、标志性特征 —— 用于 diffusion 生成图片，务必贴合原作经典造型",
  "coreMotivation": "核心动机（中文，一句话）"
}`;

    let roster: Array<{
      name?: string;
      canonicalName?: string;
      era?: string;
      role?: string;
      appearance?: string;
      coreMotivation?: string;
    }> = [];

    try {
      const raw = await ctx.callAIWithWebSearchFn(rosterPrompt);
      const parsed = extractJsonFromAI<any[]>(raw);
      if (!parsed || !Array.isArray(parsed)) return { seeded: false, created: [] };
      roster = parsed.slice(0, 15);
    } catch (e) {
      console.warn('[character-engine] fandom 角色池拉取失败:', e);
      return { seeded: false, created: [] };
    }

    // Step 3: 批量写入（去重：若已有同名角色则跳过）
    const existing = await this.list(storyId);
    const existingNames = new Set(existing.map(c => (c.name || '').trim()));
    const created: Character[] = [];
    const allowedRoles = new Set(['protagonist', 'antagonist', 'supporting', 'narrator']);

    for (const item of roster) {
      const name = (item.name || '').trim();
      if (!name || existingNames.has(name)) continue;
      if (!/[\u4e00-\u9fff]/.test(name)) continue; // 过滤非中文名
      if (!item.appearance) continue;

      const traits: string[] = [];
      if (item.canonicalName) traits.push(`canonical:${item.canonicalName.slice(0, 80)}`);
      traits.push(`appearance:${item.appearance.slice(0, 400)}`);
      traits.push(`fandom:${fandomName}`);

      const role = allowedRoles.has((item.role || '').trim()) ? (item.role as string).trim() : 'supporting';

      try {
        const newChar = await this.create({
          name,
          era: (item.era || '').slice(0, 80),
          role,
          traits,
          coreMotivation: (item.coreMotivation || '').slice(0, 200),
          storyId,
        });
        created.push(newChar);
        existingNames.add(name);
      } catch (e) {
        console.warn(`[character-engine] 预种子 ${name} 失败:`, e);
      }
    }

    // Step 4: 打标记
    try {
      await directorManager.updateState(storyId, {
        worldVariables: { ...flags, fandom_seeded: true, fandom_name: fandomName, fandom_name_en: fandomNameEn },
      });
    } catch {}

    console.log(`[character-engine] fandom 预种子完成：${fandomName}，新增 ${created.length} 个角色`);
    return { seeded: true, created };
  }

  /**
   * 扫描段落内容，返回其中被提及（按角色名精确出现）的角色 ID 列表。
   * 用于新段落写入时自动填充 characterIds，保持记忆连贯。
   */
  async extractMentionedCharacterIds(storyId: string, segmentContent: string): Promise<string[]> {
    if (!segmentContent) return [];
    const characters = await this.list(storyId);
    const hits: string[] = [];
    for (const c of characters) {
      const name = (c.name || '').trim();
      if (!name) continue;
      if (segmentContent.includes(name)) {
        hits.push(c.id);
      }
    }
    return hits;
  }

  /**
   * 自动发现 + 注册段落中新出现的角色。
   *
   * 流程：
   * 1. 让 LLM 从段落里抽取所有人物名
   * 2. 对照已有 Character 记录，筛出"新出现且未登记"的名字
   * 3. 为每个新名字再次查询 LLM 拿到 {canonicalName, era, role, appearance, coreMotivation}
   * 4. 写入 Character 表（appearance / canonicalName 以 "appearance:" / "canonical:" 前缀存入 traits）
   * 5. 返回"段落中出现的所有角色（含已存在 + 新注册）"
   *
   * 任一步失败都会静默降级，不会阻塞主流程。
   */
  async discoverAndRegisterCharacters(
    storyId: string,
    segmentContent: string,
    callAIFn: (prompt: string) => Promise<string>,
    ctx?: {
      genre?: string;
      storyDescription?: string;
      /**
       * 可选：启用了 "web search" 的 LLM 调用函数（例如 GLM 内置 web_search 工具）。
       * 若提供，用于检索角色外观这一步；可大幅提高冷门 IP 的命中率。
       */
      callAIWithWebSearchFn?: (prompt: string) => Promise<string>;
      /**
       * 可选：所在同人/名著 IP 名，用于短名歧义消解（"斑"→斑本斑 vs 斑竹；"悟空"→孙悟空 vs 孙悟空龙珠）。
       * 若未传，会尝试从 DirectorState.worldVariables.fandom_name 读取。
       */
      fandomName?: string;
    },
  ): Promise<Character[]> {
    const existing = await this.list(storyId);
    const existingNameSet = new Set(existing.map(c => (c.name || '').trim()).filter(Boolean));

    // 段落为空直接返回现有
    if (!segmentContent || segmentContent.trim().length === 0) {
      return existing.filter(c => segmentContent.includes(c.name));
    }

    // Step 1: NER 抽取段落中的人物名
    let extractedNames: string[] = [];
    try {
      const nerPrompt = `从下面这段中文文本中，抽取所有"人物角色名"（完整姓名、别名、小名、代号均可；不要地名、组织名）。
已知列表（供参考，避免重复写已有名字）：${[...existingNameSet].slice(0, 30).join('、') || '（无）'}

严格输出一个 JSON 字符串数组，不要 markdown，不要解释文字。
示例：["李白","小明"]
若没有任何人物，输出：[]

文本：
${segmentContent.slice(0, 2000)}`;

      const raw = await callAIFn(nerPrompt);
      const parsed = extractJsonFromAI<string[]>(raw);
      if (Array.isArray(parsed)) {
        extractedNames = parsed
          .filter((n: any) => typeof n === 'string' && n.trim().length > 0 && n.length <= 30 && /[\u4e00-\u9fff]/.test(n))
          .map((n: string) => n.trim());
      }
    } catch (e) {
      console.warn('[character-engine] 人物名 NER 失败:', e);
    }

    // Step 2: 筛出新名字
    const newNames = extractedNames.filter(n => !existingNameSet.has(n));

    // Step 3-4: 逐个查 LLM 拿角色档案并入库（限流到最多 5 个，防失控）
    const explicitSearchAvailable = hasExplicitWebSearch();

    // F. 尝试从 DirectorState 读取 fandom_name 作为歧义消解上下文
    let fandomName = ctx?.fandomName || '';
    if (!fandomName) {
      try {
        const { directorManager } = await import('./director-manager');
        const state = await directorManager.getState(storyId);
        const wv = (state?.worldVariables as Record<string, any>) || {};
        fandomName = (wv.fandom_name as string) || '';
      } catch {}
    }

    const created: Character[] = [];
    for (const name of newNames.slice(0, 5)) {
      try {
        // F. 搜索 query 中显式加 fandom 前缀，消除 "悟空=龙珠 or 西游记" 类歧义
        const qParts = [fandomName, name, '人物', '外观', '设定'].filter(Boolean);
        const searchQuery = qParts.join(' ');

        // 先尝试显式 Web 搜索（Tavily / Serper），拿到独立 snippet
        let webContext = '';
        if (explicitSearchAvailable) {
          try {
            const hits = await webSearch(searchQuery, { maxResults: 4 });
            webContext = formatSearchResultsForPrompt(hits);
          } catch (e) {
            console.warn(`[character-engine] 显式搜索 ${name} 失败:`, e);
          }
        }

        const fandomHint = fandomName
          ? `\n【重要歧义消解】这篇故事是《${fandomName}》的同人/改编。若"${name}"是该作品里的角色，必须严格按该作品的原版设定返回；禁止把它当其他同名角色（如《西游记》的孙悟空 vs 《龙珠》的 Son Goku）。\n`
          : '';

        const infoPrompt = `你是同人 / 文学 / 历史百科助手。以下是一个故事的背景与新登场角色名。
若该角色来自某部已知作品（动漫/小说/游戏/影视/历史），请按原作的规范设定给出；否则结合故事背景合理虚构。
${fandomHint}${webContext ? webContext + '\n\n' : ''}严格输出一个 JSON 对象，不要 markdown、不要说明文字，字段：
{
  "canonicalName": "角色的英文/罗马音名（若虚构则给一个自然的英文化名字，最多 40 字符）",
  "era": "角色所处时代或世界背景简述（中文，一句话）",
  "role": "protagonist | antagonist | supporting | narrator",
  "appearance": "纯英文 1-2 句，必须包含：年龄段、发型、发色、眼睛、服装、标志性特征，用于 diffusion 模型生成图片",
  "coreMotivation": "核心动机（中文，一句话）"
}

故事类型：${ctx?.genre || '未指定'}
故事简介：${(ctx?.storyDescription || '').slice(0, 200)}
角色名：${name}`;

        // 若没显式搜索结果，就走"带联网能力的 LLM"（如 GLM 内置 web_search）
        const runner = !webContext && ctx?.callAIWithWebSearchFn ? ctx.callAIWithWebSearchFn : callAIFn;
        const raw = await runner(infoPrompt);
        const parsed = extractJsonFromAI<{
          canonicalName?: string;
          era?: string;
          role?: string;
          appearance?: string;
          coreMotivation?: string;
        }>(raw);
        if (!parsed || !parsed.appearance) continue;

        const traits: string[] = [];
        if (parsed.canonicalName) traits.push(`canonical:${parsed.canonicalName.slice(0, 80)}`);
        traits.push(`appearance:${parsed.appearance.slice(0, 400)}`);

        const allowedRoles = new Set(['protagonist', 'antagonist', 'supporting', 'narrator']);
        const role = allowedRoles.has((parsed.role || '').trim()) ? (parsed.role as string).trim() : 'supporting';

        const newChar = await this.create({
          name,
          era: (parsed.era || '').slice(0, 80),
          role,
          traits,
          coreMotivation: (parsed.coreMotivation || '').slice(0, 200),
          storyId,
          appearance: (parsed.appearance || '').slice(0, 400),
          canonicalName: (parsed.canonicalName || '').slice(0, 80),
        });
        created.push(newChar);
        console.log(`[character-engine] 自动注册角色：${name} → ${parsed.canonicalName || '(无英文名)'}`);
      } catch (e) {
        console.warn(`[character-engine] 自动注册角色 "${name}" 失败:`, e);
      }
    }

    // Step 5: 返回段落中出现的所有角色（含已存在 + 新注册）
    const all = [...existing, ...created];
    return all.filter(c => c.name && segmentContent.includes(c.name));
  }

  /**
   * 用 AI 从段落文本提取"角色 → 当前状态"的一句话快照，写入 stateHistory。
   * 任一步失败都会静默降级，不阻塞主流程。
   */
  async inferAndUpdateStatesForSegment(
    storyId: string,
    segmentId: string,
    segmentContent: string,
    callAIFn: (prompt: string) => Promise<string>,
  ): Promise<void> {
    try {
      const mentioned = await this.extractMentionedCharacterIds(storyId, segmentContent);
      if (mentioned.length === 0) return;

      const chars = await prisma.character.findMany({ where: { id: { in: mentioned } } });
      if (chars.length === 0) return;

      const nameList = chars.map(c => c.name).join('、');
      const prompt = `阅读以下段落，为每个角色用一句话（不超过 30 字）描述其"当前状态"（身体状态、情绪、所处位置、在做什么）。
段落：
${segmentContent.slice(0, 1500)}

只输出 JSON 数组，格式：
[{"name":"角色名","state":"一句话状态"}]
只输出这些角色：${nameList}`;

      const raw = await callAIFn(prompt);
      const parsed = extractJsonFromAI<Array<{ name: string; state: string }>>(raw);
      if (!parsed || !Array.isArray(parsed)) return;

      for (const entry of parsed) {
        const c = chars.find(x => x.name === entry.name);
        if (!c || !entry.state) continue;
        await this.updateCharacterState(c.id, segmentId, entry.state.slice(0, 60));
      }
    } catch (e) {
      console.warn('[character-engine] 状态推断/更新失败:', e);
    }
  }
}

// Singleton
export const characterManager = new CharacterManager();
