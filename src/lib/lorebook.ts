import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

type LorebookEntry = {
  id: string;
  era: string;
  topic: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Lorebook — 设定集管理器
 * 管理历史朝代的社会制度、官职体系、礼仪规则等世界观设定
 */
class Lorebook {
  private filePath: string;

  constructor() {
    this.filePath = path.join(DATA_DIR, 'lorebook.json');
  }

  private async load(): Promise<LorebookEntry[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // 首次加载时从预设数据初始化
      const preset = await this.loadPreset();
      await this.save(preset);
      return preset;
    }
  }

  private async save(data: LorebookEntry[]): Promise<void> {
    try { await fs.access(DATA_DIR); } catch { await fs.mkdir(DATA_DIR, { recursive: true }); }
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  private async loadPreset(): Promise<LorebookEntry[]> {
    try {
      const presetPath = path.join(DATA_DIR, 'lorebook.preset.json');
      const data = await fs.readFile(presetPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /** 按朝代和主题查询设定条目 */
  async getEntries(era?: string, topics?: string[]): Promise<LorebookEntry[]> {
    const all = await this.load();
    return all.filter(entry => {
      if (era && entry.era !== era) return false;
      if (topics && topics.length > 0 && !topics.some(t =>
        entry.topic === t || entry.tags?.includes(t)
      )) return false;
      return true;
    });
  }

  /** 获取所有条目 */
  async getAll(): Promise<LorebookEntry[]> {
    return this.load();
  }

  /** 获取所有朝代列表 */
  async getEras(): Promise<string[]> {
    const all = await this.load();
    return [...new Set(all.map(e => e.era))];
  }

  /** 新增条目 */
  async addEntry(entry: Omit<LorebookEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<LorebookEntry> {
    const all = await this.load();
    const newEntry: LorebookEntry = {
      ...entry,
      id: `lore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newEntry);
    await this.save(all);
    return newEntry;
  }

  /** 按关键词搜索 */
  async search(keyword: string): Promise<LorebookEntry[]> {
    const all = await this.load();
    const kw = keyword.toLowerCase();
    return all.filter(e =>
      e.title.toLowerCase().includes(kw) ||
      e.content.toLowerCase().includes(kw) ||
      e.topic.toLowerCase().includes(kw) ||
      e.tags?.some(t => t.toLowerCase().includes(kw))
    );
  }
}

export const lorebook = new Lorebook();
export type { LorebookEntry };
