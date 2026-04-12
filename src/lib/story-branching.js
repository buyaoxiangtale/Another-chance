const StoryPromptService = require('./story-prompt');
const { storyStore } = require('./db');

// 分叉生成逻辑
class StoryBranchingService {
  constructor(aiService) {
    this.aiService = aiService;
    this.promptService = new StoryPromptService(aiService);
  }

  // 基于关键转折点生成多条分支
  async generateBranches(storyId, segmentId, options = {}) {
    try {
      // 获取故事和当前段落
      const stories = await storyStore.getAllStories();
      const segments = await storyStore.getSegmentsByStoryId(storyId);
      
      const story = stories.find(s => s.id === storyId);
      const currentSegment = segments.find(s => s.id === segmentId);

      if (!story || !currentSegment) {
        throw new Error('故事或段落不存在');
      }

      if (!currentSegment.isBranchPoint) {
        throw new Error('当前段落不是分叉点');
      }

      // 生成分叉 prompt
      const { prompt } = this.promptService.generateBranchPrompt(story, currentSegment, {
        branchType: options.branchType || 'alternate',
        style: options.style || '古典文学风格',
        tone: options.tone || '严肃',
        alternativeDirections: options.alternativeDirections || [],
        userInstructions: options.userInstructions || ''
      });

      console.log('生成分叉 prompt:', prompt);

      // 调用 AI 生成分支
      const response = await this.aiService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 1000
      });

      // 解析 AI 响应，提取分支信息
      const branches = this.parseBranchResponse(response);
      
      // 创建数据库中的分支记录
      const createdBranches = [];
      for (const branch of branches) {
        const branchData = {
          segmentId: segmentId,
          parentStoryId: storyId,
          title: branch.title,
          description: branch.description
        };

        const createdBranch = await storyStore.createBranch(branchData);
        createdBranches.push({
          ...createdBranch,
          branchSegments: branch.segments
        });

        // 为每个分支创建段落
        for (let i = 0; i < branch.segments.length; i++) {
          const segmentData = {
            storyId: storyId,
            title: branch.segments[i].title,
            content: branch.segments[i].content,
            order: currentSegment.order + i + 1,
            isBranchPoint: i === branch.segments.length - 1, // 最后一个段落设为分叉点
            parentBranchId: createdBranch.id,
            imageUrls: []
          };

          await storyStore.createSegment(segmentData);
        }
      }

      return {
        success: true,
        branches: createdBranches,
        originalResponse: response,
        totalBranches: createdBranches.length
      };

    } catch (error) {
      console.error('生成分支失败:', error);
      return {
        success: false,
        error: error.message,
        branches: []
      };
    }
  }

  // 解析 AI 响应，提取分支信息
  parseBranchResponse(response) {
    const branches = [];
    const lines = response.split('\n');
    
    let currentBranch = null;
    let currentSegment = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 检测分支标题
      if (trimmedLine.startsWith('分支')) {
        if (currentBranch) {
          if (currentSegment) {
            currentBranch.segments.push(currentSegment);
          }
          branches.push(currentBranch);
        }
        
        currentBranch = {
          title: '',
          description: '',
          segments: []
        };
        
        const match = trimmedLine.match(/分支[一二三四五六七八九十]+：/);
        if (match) {
          currentBranch.title = match[0].replace('：', '');
        }
      }
      // 检测内容描述
      else if (trimmedLine && !trimmedLine.startsWith('分支') && currentBranch) {
        if (!currentBranch.description) {
          currentBranch.description = trimmedLine;
        } else if (currentSegment && currentSegment.content) {
          // 段落内容
          currentSegment.content += ' ' + trimmedLine;
        } else {
          // 分支描述
          currentBranch.description += ' ' + trimmedLine;
        }
      }
    }
    
    // 添加最后一个分支
    if (currentBranch) {
      if (currentSegment) {
        currentBranch.segments.push(currentSegment);
      }
      branches.push(currentBranch);
    }

    // 为每个分支生成示例段落
    return branches.map(branch => ({
      ...branch,
      segments: this.generateSampleSegments(branch.description, branch.title)
    }));
  }

  // 生成示例段落
  generateSampleSegments(description, title) {
    // 这里可以根据描述生成更具体的段落
    // 现在返回一些通用的段落结构
    return [
      {
        title: `${title}的开始`,
        content: `故事的${title}就此展开。${description}这个重要的转折点将改变整个故事的走向。`
      },
      {
        title: `${title}的发展`,
        content: `随着情节的发展，${title}的影响逐渐显现。新的挑战和机遇出现在主角面前。`
      }
    ];
  }

  // 智能识别分叉点
  async identifyBranchPoints(storyId, options = {}) {
    try {
      const segments = await this.treeService.getStorySegments(storyId);
      
      const branchPoints = segments.filter(segment => segment.isBranchPoint);
      
      // 如果没有标记的分叉点，使用 AI 识别
      if (branchPoints.length === 0 && options.useAI) {
        return await this.aiIdentifyBranchPoints(storyId);
      }
      
      return {
        success: true,
        branchPoints,
        totalPoints: branchPoints.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        branchPoints: []
      };
    }
  }

  // 使用 AI 识别分叉点
  async aiIdentifyBranchPoints(storyId) {
    const stories = await storyStore.getAllStories();
    const segments = await storyStore.getAllSegments();
    
    const story = stories.find(s => s.id === storyId);
    const storySegments = segments.filter(s => s.storyId === storyId);
    
    if (!story) {
      throw new Error('故事不存在');
    }

    // 生成识别分叉点的 prompt
    const prompt = `
故事：${story.title}
背景：${story.description}

请分析以下故事段落，识别出可以作为分叉点的关键位置：

${storySegments.map((s, index) => `
段落 ${index + 1}: ${s.title || '无标题'}
内容：${s.content}
`).join('\n')}

识别标准：
1. 历史重大转折点
2. 人物命运关键抉择
3. 战役或事件的重要节点
4. 具有多种可能性的情节位置

请输出可以设置为分叉点的段落编号（从1开始），以及简要说明为什么这些位置适合作为分叉点。
`;

    try {
      const response = await this.aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 500
      });

      // 解析 AI 响应，提取分叉点建议
      const branchPoints = this.parseBranchPointResponse(response, storySegments);
      
      // 更新数据库中的分叉点标记
      // Note: The current db.ts implementation doesn't support updating individual segments
      // This would need to be implemented in a real application
      console.log('Would update branch points:', branchPoints);

      return {
        success: true,
        branchPoints,
        aiAnalysis: response,
        totalPoints: branchPoints.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        branchPoints: []
      };
    }
  }

  // 解析分叉点识别响应
  parseBranchPointResponse(response, allSegments) {
    const branchPoints = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const match = line.match(/段落\s*(\d+)/);
      if (match) {
        const segmentIndex = parseInt(match[1]) - 1;
        if (segmentIndex >= 0 && segmentIndex < allSegments.length) {
          const segment = allSegments[segmentIndex];
          if (!branchPoints.find(bp => bp.id === segment.id)) {
            branchPoints.push({
              id: segment.id,
              title: segment.title,
              content: segment.content,
              index: segmentIndex
            });
          }
        }
      }
    }
    
    return branchPoints;
  }

  // 生成分支建议
  async generateBranchSuggestions(storyId, segmentId, options = {}) {
    try {
      const stories = await storyStore.getAllStories();
      const segments = await storyStore.getAllSegments();
      
      const story = stories.find(s => s.id === storyId);
      const currentSegment = segments.find(s => s.id === segmentId);

      if (!story || !currentSegment) {
        throw new Error('故事或段落不存在');
      }

      // 生成分支建议的 prompt
      const prompt = `
故事：${story.title}
当前段落：${currentSegment.title}
内容：${currentSegment.content}

请为这个关键分叉点提供3个不同的故事发展方向建议：

1. 历史真实走向：如果历史按照真实轨迹发展
2. 虚构成功路径：如果某个关键事件成功了
3. 完全不同的结局：如果故事走向完全改变

每个建议包括：
- 分支标题
- 简要描述（50字以内）
- 发展方向说明
`;

      const response = await this.aiService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 600
      });

      const suggestions = this.parseBranchSuggestions(response);
      
      return {
        success: true,
        suggestions,
        currentSegment,
        aiResponse: response
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  }

  // 解析分支建议
  parseBranchSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n');
    
    let currentSuggestion = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('建议') || trimmedLine.includes('分支')) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = {
          title: '',
          description: '',
          direction: ''
        };
      } else if (trimmedLine && currentSuggestion) {
        if (!currentSuggestion.title) {
          currentSuggestion.title = trimmedLine;
        } else if (!currentSuggestion.description) {
          currentSuggestion.description = trimmedLine;
        } else {
          currentSuggestion.direction += ' ' + trimmedLine;
        }
      }
    }
    
    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }

    return suggestions;
  }
}

module.exports = StoryBranchingService;