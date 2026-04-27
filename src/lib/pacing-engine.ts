/**
 * 5.3 PacingEngine — 节奏控制引擎
 * 根据节奏配置控制 AI 生成体量
 */

import type { PacingPace, PacingConfig } from '@/types/story';

const PACE_WORD_RANGES: Record<PacingPace, [number, number]> = {
  rush: [50, 100],
  detailed: [250, 400],
  pause: [80, 150],
  summary: [150, 250],
};

/** 按 pace 对应的 maxTokens（中文字符数 × ~3.5 token/字 + 20% 余量） */
const PACE_MAX_TOKENS: Record<PacingPace, number> = {
  rush: 500,
  detailed: 1500,
  pause: 600,
  summary: 1000,
};

const PACE_INSTRUCTIONS: Record<PacingPace, string> = {
  rush: '节奏紧凑，用简短的句子快速推进情节，制造紧迫感。少用描写，多用动作和对话。',
  detailed: '节奏舒缓，用细腻的笔触描写场景、心理和氛围。注重感官细节和情感层次。',
  pause: '节奏放缓，聚焦于角色的内心世界或环境氛围的静态描写。留白和停顿，让读者喘息。',
  summary: '节奏平稳，用概述性的语言推进时间线，串联多个事件或场景。保持叙事流畅但不拖沓。',
};

export class PacingEngine {
  private config: PacingConfig;

  constructor(config: PacingConfig) {
    this.config = config;
  }

  getWordRange(): [number, number] {
    return PACE_WORD_RANGES[this.config.pace];
  }

  getWordInstruction(): string {
    const [min, max] = this.getWordRange();
    return `请生成 ${min}-${max} 字的内容。`;
  }

  getPaceInstruction(): string {
    return PACE_INSTRUCTIONS[this.config.pace];
  }

  getMoodInstruction(): string {
    if (!this.config.mood) return '';
    return `情绪基调：${this.config.mood}。`;
  }

  /** 根据节奏模式返回 AI 生成的 maxTokens 上限 */
  getMaxTokens(): number {
    return PACE_MAX_TOKENS[this.config.pace];
  }

  getMaxLinesPerStep(): number {
    return this.config.maxLinesPerStep || 1;
  }

  /**
   * 将 AI 生成的内容按语义分段（句号/换行/分段）
   */
  splitIntoLines(content: string): string[] {
    // 先按换行分段，再按句号分
    const rawLines = content.split(/\n+/).filter(l => l.trim());
    const lines: string[] = [];

    for (const raw of rawLines) {
      // 如果一行超过200字，按句号分割
      if (raw.length > 200) {
        const sentences = raw.match(/[^。！？]+[。！？]/g) || [raw];
        let buffer = '';
        for (const s of sentences) {
          if (buffer.length + s.length > 200 && buffer) {
            lines.push(buffer.trim());
            buffer = s;
          } else {
            buffer += s;
          }
        }
        if (buffer.trim()) lines.push(buffer.trim());
      } else {
        lines.push(raw.trim());
      }
    }

    return lines;
  }

  /**
   * 构建完整的节奏指令
   */
  buildPacingInstruction(): string {
    const parts = [
      '【节奏控制】',
      `节奏模式：${this.config.pace.toUpperCase()}`,
      this.getPaceInstruction(),
      this.getWordInstruction(),
    ];
    if (this.config.mood) {
      parts.push(this.getMoodInstruction());
    }
    return parts.join('\n');
  }
}
