/**
 * FandomLorebook — 原著知识库管理器
 * 管理同人作品的原著世界观设定，避免 AI 续写时出现原著事实错误
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export type FandomEntry = {
  id: string;
  fandom: string;       // 作品名：火影忍者、海贼王、龙珠等
  topic: string;        // 分类：时间线、角色关系、角色信息、世界观、禁止事项等
  title: string;
  content: string;
  tags?: string[];
  keywords?: string[];  // 用于快速匹配的关键词
  createdAt?: string;
  updatedAt?: string;
};

class FandomLorebook {
  private filePath: string;

  constructor() {
    this.filePath = path.join(DATA_DIR, 'fandom-lorebook.json');
  }

  private async load(): Promise<FandomEntry[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async save(data: FandomEntry[]): Promise<void> {
    try { await fs.access(DATA_DIR); } catch { await fs.mkdir(DATA_DIR, { recursive: true }); }
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** 获取所有作品名 */
  async getFandoms(): Promise<string[]> {
    const all = await this.load();
    return [...new Set(all.map(e => e.fandom))];
  }

  /** 按作品名查询所有条目 */
  async getEntries(fandom: string): Promise<FandomEntry[]> {
    const all = await this.load();
    return all.filter(e => e.fandom === fandom);
  }

  /** 按作品名和主题查询 */
  async getByTopic(fandom: string, topic: string): Promise<FandomEntry[]> {
    const entries = await this.getEntries(fandom);
    return entries.filter(e => e.topic === topic || e.tags?.includes(topic));
  }

  /**
   * 根据故事 description 自动匹配原著知识库
   * 通过关键词匹配确定故事属于哪个作品
   */
  async matchFandom(description: string, genre?: string): Promise<{ fandom: string; entries: FandomEntry[] }> {
    const all = await this.load();
    if (all.length === 0) return { fandom: '', entries: [] };

    // 同人类型才匹配
    if (genre) {
      const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '奇幻', '轻小说', '网文'];
      if (!fictionKeywords.some(k => genre.includes(k))) return { fandom: '', entries: [] };
    }

    // 按 fandom 分组，计算每个作品的关键词匹配分
    const fandomScores = new Map<string, number>();
    for (const entry of all) {
      const keywords = entry.keywords || [];
      const titleWords = entry.fandom.split('');
      let score = 0;
      for (const kw of keywords) {
        if (description.includes(kw)) score += 2;
      }
      // 作品名本身匹配
      if (description.includes(entry.fandom)) score += 5;
      for (const char of titleWords) {
        if (description.includes(char) && char.length > 1) score += 0.1;
      }
      if (score > 0) {
        fandomScores.set(entry.fandom, (fandomScores.get(entry.fandom) || 0) + score);
      }
    }

    // 取最高分
    let bestFandom = '';
    let bestScore = 0;
    for (const [fandom, score] of fandomScores) {
      if (score > bestScore) {
        bestScore = score;
        bestFandom = fandom;
      }
    }

    if (!bestFandom || bestScore < 2) return { fandom: '', entries: [] };

    const entries = all.filter(e => e.fandom === bestFandom);
    return { fandom: bestFandom, entries };
  }

  /**
   * 将匹配到的原著知识格式化为 AI prompt 片段
   */
  buildFandomPrompt(entries: FandomEntry[]): string {
    if (entries.length === 0) return '';

    const lines: string[] = [];
    lines.push('## 原著知识参考（必须遵循）');

    // 优先放禁止事项
    const forbidden = entries.filter(e => e.topic === '禁止事项');
    const others = entries.filter(e => e.topic !== '禁止事项');

    for (const entry of others) {
      lines.push('');
      lines.push(`### ${entry.title}`);
      lines.push(entry.content);
    }

    if (forbidden.length > 0) {
      lines.push('');
      lines.push('### ⚠️ 常见错误（绝对禁止）');
      for (const entry of forbidden) {
        lines.push('');
        lines.push(`**${entry.title}**`);
        lines.push(entry.content);
      }
    }

    return lines.join('\n');
  }

  /** 新增条目 */
  async addEntry(entry: Omit<FandomEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<FandomEntry> {
    const all = await this.load();
    const newEntry: FandomEntry = {
      ...entry,
      id: `fandom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newEntry);
    await this.save(all);
    return newEntry;
  }

  /** 按关键词搜索 */
  async search(keyword: string): Promise<FandomEntry[]> {
    const all = await this.load();
    const kw = keyword.toLowerCase();
    return all.filter(e =>
      e.fandom.toLowerCase().includes(kw) ||
      e.title.toLowerCase().includes(kw) ||
      e.content.toLowerCase().includes(kw) ||
      e.keywords?.some(k => k.toLowerCase().includes(kw))
    );
  }
}

export const fandomLorebook = new FandomLorebook();
