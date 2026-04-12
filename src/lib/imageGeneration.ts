import { ImageGenerationRequest, ImageGenerationResponse } from '@/types/story_classes';

// 图片生成服务预留 (P6-2)
export class ImageGenerationService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.AI_IMAGE_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.AI_IMAGE_API_KEY || '';
    this.model = process.env.AI_IMAGE_MODEL || 'dall-e-3';
  }

  // 生成图片
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const { segmentId, prompt, style, size = '512x512', quality = 'standard' } = request;

      // 构建图片生成 prompt
      const enhancedPrompt = this.enhancePrompt(prompt, style);

      // 调用 AI 图片生成 API
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: enhancedPrompt,
          n: 1,
          size,
          quality,
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        throw new Error(`图片生成失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 处理响应
      if (data.data && data.data.length > 0) {
        const imageUrl = data.data[0].url;
        
        return {
          success: true,
          imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageUrl,
        };
      } else {
        throw new Error('AI 返回的图片数据为空');
      }
    } catch (error) {
      console.error('图片生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '图片生成失败',
      };
    }
  }

  // 增强图片生成 prompt
  private enhancePrompt(prompt: string, style?: string): string {
    let enhancedPrompt = prompt;

    if (style) {
      enhancedPrompt = `${enhancedPrompt}, ${style}风格`;
    }

    // 添加历史故事相关的提示词
    enhancedPrompt += `, 中国古代历史风格, 高质量, 详细细节`;

    return enhancedPrompt;
  }

  // 支持的图片尺寸
  getSupportedSizes(): Array<'256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'> {
    return ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
  }

  // 支持的图片质量
  getSupportedQualities(): Array<'standard' | 'hd'> {
    return ['standard', 'hd'];
  }

  // 支持的风格
  getSupportedStyles(): string[] {
    return [
      'realistic',
      'artistic', 
      'cartoon',
      'historical',
      'fantasy',
      'traditional chinese painting',
      'ink wash painting'
    ];
  }
}

// 创建图片生成服务实例
export const imageGenerationService = new ImageGenerationService();