/**
 * 古事 (Gushi) 故事生成压力测试脚本
 *
 * 自动化测试：注册 → 登录 → 创建故事 → 连续生成 200 段 → 创建分支 → 输出报告
 *
 * 用法：
 *   npx tsx scripts/stress-test-story.ts [选项]
 *
 * 选项：
 *   --segments=200       生成段落数（默认 200）
 *   --base-url=http://localhost:3000  服务地址
 *   --branch-interval=20 每隔 N 段创建一个分叉
 *   --no-branch          不创建分叉
 *   --pause=1000         每次续写之间的间隔（ms）
 *   --verbose            打印每一段的详细内容
 */

// ─── 参数解析 ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string) => {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : defaultVal;
};
const hasFlag = (name: string) => args.includes(`--${name}`);

const BASE_URL = getArg('base-url', 'http://localhost:3000');
const TOTAL_SEGMENTS = parseInt(getArg('segments', '200'), 10);
const BRANCH_INTERVAL = parseInt(getArg('branch-interval', '20'), 10);
const NO_BRANCH = hasFlag('no-branch');
const PAUSE_MS = parseInt(getArg('pause', '1000'), 10);
const VERBOSE = hasFlag('verbose');

// ─── 预设故事库 ────────────────────────────────────────────────────────

const STORY_PRESETS = [
  {
    title: '大唐长安夜',
    description: '唐朝天宝年间，长安城西市的一个波斯商人偶然得到一张藏宝图，卷入了一场跨越丝绸之路的惊天密谋。暗流涌动的帝国边境、繁华的长安夜市、神秘的西域古国，一段关于忠诚与背叛的传奇就此展开。',
    genre: '历史',
    era: '唐朝',
    storyType: 'history',
  },
  {
    title: '末世黎明',
    description: '一场神秘的病毒在全球蔓延，感染者会逐渐失去记忆但获得超常的计算能力。大学生林晨在被感染后发现，自己遗忘的记忆中隐藏着拯救世界的关键——但这意味着他必须在完全忘记之前完成一切。',
    genre: '科幻',
    era: '近未来',
    storyType: 'scifi',
  },
  {
    title: '江湖行',
    description: '北宋年间，一个不会武功的少年因为一封遗书踏上了江湖路。他手无缚鸡之力，却凭借过人的智谋和对人性的洞察，在刀光剑影中走出了一条属于自己的侠道。各大门派、朝廷势力、江湖义士，都在他的一局棋中。',
    genre: '武侠',
    era: '北宋',
    storyType: 'wuxia',
  },
  {
    title: '星际学院',
    description: '公元2847年，人类已经在银河系建立了数百个殖民地。来自边缘星球的天才少女苏晚被银河联邦学院录取，却在入学第一天发现学院地下隐藏着一个关于人类起源的惊天秘密。',
    genre: '科幻',
    era: '未来',
    storyType: 'scifi',
  },
  {
    title: '民国谍影',
    description: '1937年上海沦陷前夕，三面间谍陈默代号"棋手"，游走于军统、中统、日特和地下党之间。每一步都是赌博，每一个人都可能是敌人。在情报的迷雾中，他必须找到那个被称为"影子"的双面间谍。',
    genre: '谍战',
    era: '民国',
    storyType: 'history',
  },
];

const BRANCH_DIRECTIONS = [
  '主角突然发现一个隐藏的地下室',
  '一个神秘陌生人出现了',
  '天降暴风雨，所有人被困在一起',
  '主角收到一封来自未来的信',
  '一场意外的爆炸改变了所有人的计划',
  '主角发现了一个惊天秘密',
  '一个被以为已死的人突然出现了',
  '主角被冤枉，成为通缉犯',
  '发现一张古老的地图指向未知之地',
  '主角不得不面对内心最深的恐惧',
  '时间突然倒流，回到了关键时刻',
  '一场突如其来的瘟疫席卷全城',
];

// ─── 工具函数 ──────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

function logSuccess(msg: string) {
  log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function logError(msg: string) {
  log(`\x1b[31m✗\x1b[0m ${msg}`);
}

function logInfo(msg: string) {
  log(`\x1b[36mℹ\x1b[0m ${msg}`);
}

function logWarn(msg: string) {
  log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m${sec}s`;
}

// ─── HTTP 客户端 ───────────────────────────────────────────────────────

let cookies = '';

async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookies) headers['Cookie'] = cookies;

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual', // 不跟随重定向，手动处理
  });

  // 收集 set-cookie
  const setCookies = resp.headers.getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    const newCookies = setCookies
      .map(c => c.split(';')[0])
      .join('; ');
    cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
  }

  // 尝试解析 JSON
  let data: any = null;
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await resp.json();
  } else {
    const text = await resp.text();
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  }

  return { status: resp.status, data };
}

// ─── 认证 ──────────────────────────────────────────────────────────────

async function ensureAuth(): Promise<string> {
  const testEmail = `stress-test-${Date.now()}@gushi.test`;
  const testPassword = 'test123456';

  // 注册
  logInfo(`注册测试用户: ${testEmail}`);
  const reg = await api('POST', '/api/auth/register', {
    name: '压力测试员',
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword,
  });

  if (reg.status === 409) {
    // 已存在，尝试直接登录
    logInfo('用户已存在，直接登录');
  } else if (reg.status !== 201) {
    throw new Error(`注册失败 (${reg.status}): ${JSON.stringify(reg.data)}`);
  } else {
    logSuccess(`注册成功: ${reg.data.user?.name}`);
  }

  // 登录（NextAuth Credentials）
  logInfo('登录中...');
  const login = await api('POST', '/api/auth/callback/credentials', {
    email: testEmail,
    password: testPassword,
    // NextAuth CSRF token 需要先获取
  });

  // NextAuth 需要 CSRF token，换个方式
  // 先获取 CSRF token
  const csrfResp = await api('GET', '/api/auth/csrf');
  const csrfToken = csrfResp.data?.csrfToken;

  if (!csrfToken) {
    logWarn('无法获取 CSRF token，尝试直接调用...');
  }

  // 用 form-urlencoded 格式登录
  const loginUrl = `${BASE_URL}/api/auth/callback/credentials`;
  const loginBody = new URLSearchParams({
    email: testEmail,
    password: testPassword,
    csrfToken: csrfToken || '',
    json: 'true',
  });

  const loginHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (cookies) loginHeaders['Cookie'] = cookies;

  const loginResp = await fetch(loginUrl, {
    method: 'POST',
    headers: loginHeaders,
    body: loginBody.toString(),
    redirect: 'manual',
  });

  const setCookies = loginResp.headers.getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    const newCookies = setCookies
      .map(c => c.split(';')[0])
      .join('; ');
    cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
  }

  if (loginResp.status === 200 || loginResp.status === 302 || loginResp.status === 307) {
    logSuccess('登录成功');
    return testEmail;
  }

  // 如果登录失败，尝试用已有用户
  throw new Error(`登录失败 (${loginResp.status})`);
}

// ─── 核心测试流程 ───────────────────────────────────────────────────────

interface Metrics {
  totalSegments: number;
  successCount: number;
  failCount: number;
  branchCount: number;
  characterCount: number;
  segmentTimes: number[];
  errors: Array<{ segment: number; error: string; time: string }>;
  characters: Array<{ name: string; role: string; discoveredAt: number }>;
  branches: Array<{ id: string; title: string; createdAt: number }>;
  startTime: number;
  totalTokens: number;
  warnings: { consistency: number; timeline: number };
}

async function runTest() {
  const metrics: Metrics = {
    totalSegments: TOTAL_SEGMENTS,
    successCount: 0,
    failCount: 0,
    branchCount: 0,
    characterCount: 0,
    segmentTimes: [],
    errors: [],
    characters: [],
    branches: [],
    startTime: Date.now(),
    totalTokens: 0,
    warnings: { consistency: 0, timeline: 0 },
  };

  // 检查服务是否可用
  logInfo(`检查服务: ${BASE_URL}`);
  try {
    const health = await fetch(BASE_URL);
    if (!health.ok) throw new Error(`HTTP ${health.status}`);
    logSuccess('服务可用');
  } catch (e) {
    logError(`服务不可用: ${(e as Error).message}`);
    logInfo('请先启动开发服务器: npm run dev');
    process.exit(1);
  }

  // 认证
  log('\n━━━ 阶段 1: 认证 ━━━');
  const email = await ensureAuth();

  // 创建故事
  log('\n━━━ 阶段 2: 创建故事 ━━━');
  const preset = pickRandom(STORY_PRESETS);
  logInfo(`创建故事: ${preset.title}`);

  const createResp = await api('POST', '/api/stories', {
    title: `${preset.title} (压力测试)`,
    description: preset.description,
    genre: preset.genre,
    era: preset.era,
    storyType: preset.storyType,
  });

  if (createResp.status !== 200 && createResp.status !== 201) {
    logError(`创建故事失败 (${createResp.status}): ${JSON.stringify(createResp.data)}`);
    process.exit(1);
  }

  const storyId = createResp.data.story.id;
  const rootSegmentId = createResp.data.firstSegment?.id || createResp.data.story.rootSegmentId;
  logSuccess(`故事已创建: ${storyId}`);
  logInfo(`  标题: ${createResp.data.story.title}`);
  logInfo(`  类型: ${preset.genre} | 时代: ${preset.era}`);

  // 连续生成段落
  log(`\n━━━ 阶段 3: 连续生成 ${TOTAL_SEGMENTS} 段 ━━━`);

  let currentBranchId = 'main';
  let lastSegmentId = rootSegmentId;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  for (let i = 1; i <= TOTAL_SEGMENTS; i++) {
    const segStart = Date.now();
    const progress = `[${i}/${TOTAL_SEGMENTS}]`;

    try {
      const resp = await api('POST', `/api/stories/${storyId}/continue`, {
        branchId: currentBranchId,
      });

      const elapsed = Date.now() - segStart;

      if (resp.status === 200 && resp.data.success) {
        metrics.successCount++;
        metrics.segmentTimes.push(elapsed);
        consecutiveFailures = 0;

        const seg = resp.data.segment;
        lastSegmentId = seg.id; // 记录用于后续分叉
        const charCount = seg.characterIds?.length || 0;
        const contentLen = seg.content?.length || 0;
        const consistencyWarns = resp.data.warnings?.consistency?.length || 0;
        const timelineWarns = resp.data.warnings?.timeline?.length || 0;
        metrics.warnings.consistency += consistencyWarns;
        metrics.warnings.timeline += timelineWarns;

        if (VERBOSE && seg.content) {
          log(`${progress} \x1b[90m${seg.content.slice(0, 80).replace(/\n/g, ' ')}...\x1b[0m`);
        } else {
          // 进度条
          const pct = Math.round((i / TOTAL_SEGMENTS) * 100);
          const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
          process.stdout.write(`\r${progress} ${bar} ${pct}% | ${formatDuration(elapsed)}/段 | 角色:${charCount} | ${contentLen}字`);
          if (i % 10 === 0) process.stdout.write('\n');
        }

        // 记录发现的角色
        if (charCount > 0 && !metrics.characters.find(c => c.name === seg.characterIds[0])) {
          // 稍后统一查询
        }

      } else {
        metrics.failCount++;
        consecutiveFailures++;
        const errMsg = resp.data?.error || `HTTP ${resp.status}`;
        logError(`${progress} 生成失败: ${errMsg}`);
        metrics.errors.push({ segment: i, error: errMsg, time: new Date().toISOString() });
      }

    } catch (e) {
      metrics.failCount++;
      consecutiveFailures++;
      const errMsg = (e as Error).message;
      logError(`${progress} 网络错误: ${errMsg}`);
      metrics.errors.push({ segment: i, error: errMsg, time: new Date().toISOString() });
    }

    // 连续失败过多，暂停后重试
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      logWarn(`连续失败 ${consecutiveFailures} 次，等待 30 秒后继续...`);
      await sleep(30000);
      consecutiveFailures = 0;
    }

    // 定期创建分支
    if (!NO_BRANCH && i > 0 && i % BRANCH_INTERVAL === 0 && i < TOTAL_SEGMENTS && lastSegmentId) {
      try {
        await createBranch(storyId, lastSegmentId, i, metrics);
      } catch (e) {
        logWarn(`分支创建失败: ${(e as Error).message}`);
      }
    }

    // 间隔控制，避免过载
    if (PAUSE_MS > 0 && i < TOTAL_SEGMENTS) {
      await sleep(PAUSE_MS);
    }
  }

  // 最终角色统计
  log('\n\n━━━ 阶段 4: 统计角色 ━━━');
  try {
    const charsResp = await api('GET', `/api/stories/${storyId}/characters`);
    if (charsResp.status === 200) {
      const chars = Array.isArray(charsResp.data) ? charsResp.data :
        charsResp.data.activeCharacters || [];
      metrics.characterCount = chars.length;
      metrics.characters = chars.map((c: any) => ({
        name: c.name,
        role: c.role,
        discoveredAt: 0,
      }));
      logSuccess(`发现 ${chars.length} 个角色:`);
      chars.slice(0, 20).forEach((c: any) => {
        log(`  - ${c.name} (${c.role}) ${c.coreMotivation ? `动机: ${c.coreMotivation.slice(0, 30)}` : ''}`);
      });
      if (chars.length > 20) log(`  ... 还有 ${chars.length - 20} 个`);
    }
  } catch (e) {
    logWarn(`角色查询失败: ${(e as Error).message}`);
  }

  // 输出报告
  printReport(metrics);
}

async function createBranch(storyId: string, segmentId: string, segmentNum: number, metrics: Metrics) {
  const direction = pickRandom(BRANCH_DIRECTIONS);
  logInfo(`\n  创建分支 @段落${segmentNum}: "${direction.slice(0, 20)}..."`);

  const branchResp = await api('POST', `/api/stories/${storyId}/branch`, {
    segmentId,
    userDirection: direction,
  });

  if (branchResp.status === 200 && branchResp.data.success) {
    metrics.branchCount++;
    const branch = branchResp.data.branch;
    metrics.branches.push({
      id: branch.id,
      title: branch.title || direction,
      createdAt: Date.now(),
    });
    logSuccess(`  分支已创建: ${branch.id}`);
  } else {
    logWarn(`  分支创建返回 ${branchResp.status}: ${JSON.stringify(branchResp.data?.error || '').slice(0, 100)}`);
  }
}

function printReport(m: Metrics) {
  const totalElapsed = Date.now() - m.startTime;
  const avgTime = m.segmentTimes.length > 0
    ? m.segmentTimes.reduce((a, b) => a + b, 0) / m.segmentTimes.length
    : 0;
  const successRate = m.totalSegments > 0
    ? ((m.successCount / m.totalSegments) * 100).toFixed(1)
    : '0';

  console.log(`
\x1b[1m╔══════════════════════════════════════════════════════════════╗
║                    故事生成压力测试报告                        ║
╚══════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1m📊 总览\x1b[0m
  目标段落数:      ${m.totalSegments}
  成功:            \x1b[32m${m.successCount}\x1b[0m
  失败:            \x1b[31m${m.failCount}\x1b[0m
  成功率:          ${successRate}%
  分支数:          ${m.branchCount}

\x1b[1m⏱ 性能\x1b[0m
  总耗时:          ${formatDuration(totalElapsed)}
  平均每段:        ${formatDuration(avgTime)}
  最快:            ${m.segmentTimes.length > 0 ? formatDuration(Math.min(...m.segmentTimes)) : 'N/A'}
  最慢:            ${m.segmentTimes.length > 0 ? formatDuration(Math.max(...m.segmentTimes)) : 'N/A'}
  吞吐量:          ${totalElapsed > 0 ? ((m.successCount / (totalElapsed / 60000)).toFixed(1)) : '0'} 段/分钟

\x1b[1m👥 角色\x1b[0m
  发现角色总数:    ${m.characterCount}
${m.characters.slice(0, 15).map(c => `  - ${c.name} (${c.role})`).join('\n')}
${m.characters.length > 15 ? `  ... 还有 ${m.characters.length - 15} 个` : ''}

\x1b[1m⚠ 警告\x1b[0m
  一致性警告:      ${m.warnings.consistency}
  时间轴警告:      ${m.warnings.timeline}

\x1b[1m❌ 错误详情 (前10条)\x1b[0m
${m.errors.slice(0, 10).map(e => `  段落${e.segment}: ${e.error}`).join('\n')}
${m.errors.length > 10 ? `  ... 还有 ${m.errors.length - 10} 条错误` : '\x1b[90m  无\x1b[0m'}

\x1b[1m🌳 分支\x1b[0m
${m.branches.length > 0 ? m.branches.map(b => `  - ${b.title}`).join('\n') : '\x1b[90m  无\x1b[0m'}

\x1b[1m📈 段落耗时分布\x1b[0m
${printTimeDistribution(m.segmentTimes)}

\x1b[90m──────────────────────────────────────────────────────────\x1b[0m
  测试完成于 ${new Date().toLocaleString('zh-CN')}
`);
}

function printTimeDistribution(times: number[]): string {
  if (times.length === 0) return '  \x1b[90m无数据\x1b[0m';

  const sorted = [...times].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return `  P50: ${formatDuration(p50)}  P75: ${formatDuration(p75)}  P90: ${formatDuration(p90)}  P99: ${formatDuration(p99)}`;
}

// ─── 入口 ──────────────────────────────────────────────────────────────

log('\x1b[1m╔══════════════════════════════════════════════════════════════╗');
log('║           古事 (Gushi) 故事生成压力测试                      ║');
log('╚══════════════════════════════════════════════════════════════╝\x1b[0m');
log(`  目标: ${TOTAL_SEGMENTS} 段 | 间隔: ${PAUSE_MS}ms | 分叉: ${NO_BRANCH ? '关闭' : `每${BRANCH_INTERVAL}段`}`);
log(`  服务: ${BASE_URL}\n`);

runTest().catch(e => {
  logError(`测试异常终止: ${(e as Error).message}`);
  console.error(e);
  process.exit(1);
});
