const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

// 迁移脚本：将现有数据从 order 模型迁移到 branchId/parentSegmentId 模型
async function migrateData() {
  try {
    console.log('开始数据迁移...');
    
    // 读取现有数据
    const storiesData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'stories.json'), 'utf-8'));
    const segmentsData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'segments.json'), 'utf-8'));
    const branchesData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'branches.json'), 'utf-8'));
    
    console.log(`找到 ${storiesData.length} 个故事, ${segmentsData.length} 个段落, ${branchesData.length} 个分支`);
    
    // 为每个故事迁移段落数据
    const storiesMap = new Map();
    storiesData.forEach(story => {
      storiesMap.set(story.id, story);
    });
    
    // 迁移段落数据
    const migratedSegments = [];
    const storySegmentOrder = new Map(); // 记录每个故事的段落顺序
    
    // 首先按故事ID和order分组
    segmentsData.forEach(segment => {
      const storyId = segment.storyId;
      
      // 初始化故事的段落顺序记录
      if (!storySegmentOrder.has(storyId)) {
        storySegmentOrder.set(storyId, []);
      }
      
      const orders = storySegmentOrder.get(storyId);
      orders.push({ segmentId: segment.id, order: segment.order, segment: segment });
    });
    
    // 为每个故事构建新的段落数据
    storiesMap.forEach(story => {
      const storyId = story.id;
      const orders = storySegmentOrder.get(storyId) || [];
      
      // 按原 order 排序
      orders.sort((a, b) => a.order - b.order);
      
      console.log(`故事 ${story.title}: ${orders.length} 个段落`);
      
      // 第一个段落作为主线开始
      if (orders.length > 0) {
        const firstSegmentData = orders[0].segment;
        migratedSegments.push({
          ...firstSegmentData,
          branchId: 'main',
          parentSegmentId: ''
        });
        
        // 后续段落构建父子关系
        for (let i = 1; i < orders.length; i++) {
          const currentSegmentData = orders[i].segment;
          const prevSegmentData = orders[i - 1].segment;
          
          migratedSegments.push({
            ...currentSegmentData,
            branchId: 'main', // 暂时都设为主线，后续分支创建时再处理
            parentSegmentId: prevSegmentData.id
          });
        }
      }
    });
    
    // 处理现有的分支数据（如果有）
    const migratedBranches = branchesData.map(branch => ({
      ...branch,
      sourceSegmentId: branch.segmentId, // 重命名字段
      userDirection: branch.description || '', // 将 description 作为用户方向
      storyId: branch.parentStoryId || branch.segmentId.split('_')[0] + '_' + branch.segmentId.split('_')[1]
    }));
    
    // 备份原始数据
    console.log('备份原始数据...');
    await fs.writeFile(path.join(DATA_DIR, 'stories_backup.json'), JSON.stringify(storiesData, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'segments_backup.json'), JSON.stringify(segmentsData, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'branches_backup.json'), JSON.stringify(branchesData, null, 2));
    
    // 保存迁移后的数据
    console.log('保存迁移后的数据...');
    await fs.writeFile(path.join(DATA_DIR, 'stories.json'), JSON.stringify(storiesData, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'segments.json'), JSON.stringify(migratedSegments, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'branches.json'), JSON.stringify(migratedBranches, null, 2));
    
    console.log('数据迁移完成！');
    console.log(`迁移后: ${migratedSegments.length} 个段落, ${migratedBranches.length} 个分支`);
    
    // 验证数据完整性
    await verifyDataIntegrity(storiesData, migratedSegments, migratedBranches);
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    throw error;
  }
}

// 验证数据完整性
async function verifyDataIntegrity(stories, segments, branches) {
  console.log('验证数据完整性...');
  
  // 检查每个故事是否有对应的段落
  stories.forEach(story => {
    const storySegments = segments.filter(s => s.storyId === story.id);
    if (storySegments.length === 0) {
      console.warn(`警告: 故事 ${story.title} 没有对应的段落`);
    } else {
      console.log(`故事 ${story.title}: ${storySegments.length} 个段落`);
    }
  });
  
  // 检查段落是否有有效的分支ID
  const mainSegments = segments.filter(s => s.branchId === 'main');
  console.log(`主线段落: ${mainSegments.length} 个`);
  
  // 检查分支数据
  if (branches.length > 0) {
    console.log(`分支数据: ${branches.length} 个分支`);
    branches.forEach(branch => {
      console.log(`- 分支 ${branch.id}: 从段落 ${branch.sourceSegmentId} 分叉`);
    });
  }
  
  console.log('数据完整性验证完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateData().then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  }).catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { migrateData };