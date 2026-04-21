/** 图片风格相关类型和常量（纯数据，无服务端依赖） */

export type ImageStyle =
  | 'auto'
  | 'historical-realistic'
  | 'ink-wash'
  | 'gongbi'
  | 'dunhuang-mural'
  | 'modern-realistic'
  | 'sci-fi-cinematic'
  | 'fantasy-epic'
  | 'wuxia'
  | 'anime'
  | 'noir-thriller';

export type ConcreteImageStyle = Exclude<ImageStyle, 'auto'>;

export const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'auto', label: '自动（按故事类型）' },
  { value: 'historical-realistic', label: '历史写实' },
  { value: 'ink-wash', label: '水墨画' },
  { value: 'gongbi', label: '工笔画' },
  { value: 'dunhuang-mural', label: '敦煌壁画' },
  { value: 'modern-realistic', label: '现代写实' },
  { value: 'sci-fi-cinematic', label: '科幻电影' },
  { value: 'fantasy-epic', label: '玄幻史诗' },
  { value: 'wuxia', label: '武侠/仙侠' },
  { value: 'anime', label: '动漫' },
  { value: 'noir-thriller', label: '悬疑黑色' },
];

export interface SceneDescription {
  prompt: string;
  description: string;
  type: 'scene' | 'character' | 'object';
}

export interface GeneratedImage {
  url: string;
  description: string;
  type: 'scene' | 'character' | 'object';
  prompt: string;
}
