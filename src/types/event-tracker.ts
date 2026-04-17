/**
 * 关键事件追踪相关类型定义
 */

export type KeyEvent = {
  eventId: string;
  storyId: string;
  branchId: string;
  segmentId: string;
  type: EventType;
  description: string;
  involvedCharacterIds: string[];
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBySegmentId?: string;
  importance: 'critical' | 'major' | 'minor';
};

export type EventType =
  | 'death'        // 角色死亡
  | 'alliance'     // 结盟
  | 'betrayal'     // 背叛
  | 'discovery'    // 重大发现
  | 'battle'       // 战斗/冲突
  | 'emotional'    // 情感转折
  | 'revelation'   // 真相揭示
  | 'departure'    // 离开/分离
  | 'arrival'      // 到来/登场
  | 'power_change' // 权力变化
  | 'relationship' // 关系变化
  | 'other';       // 其他
