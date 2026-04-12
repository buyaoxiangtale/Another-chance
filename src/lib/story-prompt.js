const AIService = require('./ai-service');

// 故事续写 prompt 模板
class StoryPromptService {
  constructor(aiService) {
    this.aiService = aiService || new AIService();
  }

  // 生成故事续写 prompt
  generateContinuationPrompt(story, currentSegment, options = {}) {
    const {
      style = '古典文学风格',
      tone = '严肃',
      length = '中等长度',
      characters = [],
      historicalContext = true,
      userInstructions = ''
    } = options;

    // 构建人物列表
    const characterList = characters.length > 0 
      ? `主要人物：${characters.join('、')}`
      : this.extractCharactersFromStory(story, currentSegment);

    // 构建故事摘要
    const summary = this.generateStorySummary(story, currentSegment);

    // 构建上下文
    const context = `
故事背景：${story.description}
故事风格：${style}
故事基调：${tone}
续写长度：${length}
${characterList}

${summary}

当前段落：${currentSegment.content}

${currentSegment.isBranchPoint ? '【关键分叉点】' : ''}
`;

    // 构建 prompt
    const prompt = `
${context}

请基于以上内容续写故事的后续发展：

要求：
1. 保持${style}的写作风格
2. 故事基调保持${tone}
3. 续写长度：${length}
4. 续写要自然流畅，与前文逻辑连贯
5. ${currentSegment.isBranchPoint ? '这是一个关键分叉点，故事将在这里产生重要转折' : '故事情节要顺承发展'}
6. ${userInstructions}

请只输出续写内容，不要包含标题或其他说明文字。
`;

    return {
      prompt: prompt.trim(),
      context: {
        story,
        currentSegment,
        style,
        tone,
        length,
        characters: characterList,
        historicalContext
      }
    };
  }

  // 生成故事分叉 prompt
  generateBranchPrompt(story, currentSegment, branchOptions = {}) {
    const {
      branchType = 'alternate', // alternate, different, extended
      style = '古典文学风格',
      tone = '严肃',
      alternativeDirections = [],
      userInstructions = ''
    } = branchOptions;

    // 构建人物列表
    const characterList = this.extractCharactersFromStory(story, currentSegment);

    // 构建故事摘要
    const summary = this.generateStorySummary(story, currentSegment);

    // 分叉类型说明
    const branchTypeDescriptions = {
      alternate: '平行时空分叉：在相同的历史背景下，出现不同的可能性发展',
      different: '关键转折分叉：历史事件的走向发生重大改变',
      extended: '细节延伸分叉：在原有基础上深入展开特定情节'
    };

    const context = `
故事背景：${story.description}
故事风格：${style}
故事基调：${tone}
分叉类型：${branchTypeDescriptions[branchType]}
${characterList}

${summary}

当前段落（分叉点）：${currentSegment.content}

【分叉要求】
请基于这个关键分叉点，生成3个不同的故事发展分支：

1. ${branchTypeDescriptions[branchType]}
2. 每个分支要有独特的情节走向和结局
3. 保持${style}的写作风格
4. 故事基调保持${tone}
5. 分支之间要有明显的差异性
6. ${userInstructions}

请为每个分支写一个简短的标题和内容描述，格式如下：

分支一：
[分支标题]
[内容描述]

分支二：
[分支标题] 
[内容描述]

分支三：
[分支标题]
[内容描述]
`;

    return {
      prompt: context.trim(),
      context: {
        story,
        currentSegment,
        branchType,
        style,
        tone,
        alternativeDirections,
        historicalContext: true
      }
    };
  }

  // 从故事中提取人物
  extractCharactersFromStory(story, currentSegment) {
    // 这里可以使用更复杂的人物识别逻辑
    // 现在简单从内容中提取常见历史人物
    const commonCharacters = [
      '秦王', '荆轲', '太子丹', '樊於期', // 荆轲刺秦王
      '曹操', '孙权', '刘备', '诸葛亮', '周瑜', // 赤壁之战
      '李世民', '李建成', '李元吉', '李渊' // 玄武门之变
    ];

    const foundCharacters = commonCharacters.filter(char => 
      currentSegment.content.includes(char) || story.description.includes(char)
    );

    return foundCharacters.length > 0 
      ? `主要人物：${foundCharacters.join('、')}`
      : '主要人物：待续';
  }

  // 生成故事摘要
  generateStorySummary(story, currentSegment) {
    // 这里可以实现更复杂的摘要生成逻辑
    // 现在简单返回当前段落之前的内容
    return `故事发展至当前段落：${currentSegment.title || '无标题'}`;
  }

  // 生成角色发展的 prompt
  generateCharacterDevelopmentPrompt(character, storyContext, options = {}) {
    const {
      developmentType = '性格深化',
      situation = '',
      style = '古典文学风格'
    } = options;

    const prompt = `
人物：${character}
故事背景：${storyContext.description}
当前情境：${situation}
发展类型：${developmentType}

写作风格：${style}

请基于以上情境，为人物"${character}"的性格发展或心理活动进行描写，要求：
1. 保持${style}的写作风格
2. 人物性格要符合历史背景
3. 心理描写要细腻真实
4. 字数控制在200-300字左右
5. 只输出描写内容，不要包含其他说明
`;

    return prompt.trim();
  }

  // 生成场景描写的 prompt
  generateSceneDescriptionPrompt(scene, storyContext, options = {}) {
    const {
      atmosphere = '庄重严肃',
      timeOfDay = '白天',
      weather = '晴朗',
      style = '古典文学风格'
    } = options;

    const prompt = `
场景：${scene}
故事背景：${storyContext.description}
时间：${timeOfDay}
天气：${weather}
氛围：${atmosphere}

写作风格：${style}

请为这个场景进行环境描写，要求：
1. 保持${style}的写作风格
2. 环境描写要服务于情节发展
3. 营造${atmosphere}的氛围
4. 字数控制在150-250字左右
5. 只输出描写内容，不要包含其他说明
`;

    return prompt.trim();
  }
}

module.exports = StoryPromptService;