# tsconfig.json 研究报告

## 1. 文件用途

tsconfig.json 是 TypeScript 编译器的配置文件，定义了"古事"项目的类型系统、模块解析策略和编译目标。它是整个前端工程化的类型安全基石，决定了 TypeScript 如何理解项目结构和代码语义。

## 2. 导出

不导出任何内容，纯配置文件。

## 3. 依赖

无直接依赖。影响所有 `.ts`/`.tsx` 文件的编译行为。

## 4. 核心逻辑

关键配置项分析：
- **target: ES2017**：编译目标为 ES2017，支持 async/await 原生语法，适合现代浏览器和 Node.js 18 环境。
- **module: esnext / moduleResolution: bundler**：使用 ESNext 模块系统和 bundler 解析策略，与 Next.js 的 Webpack/Turbopack 构建链完美配合。
- **strict: true**：启用所有严格类型检查（strictNullChecks、noImplicitAny 等），这是良好的工程实践。
- **paths: "@/*" → "./src/*"**：路径别名，允许用 `@/lib/simple-db` 代替 `../../lib/simple-db`，提升代码可读性。
- **incremental: true**：增量编译，加速开发体验。
- **plugins: [{name: "next"}]**：Next.js 专用 TypeScript 插件，提供页面路由的类型提示。

## 5. 数据流

tsconfig.json → TypeScript 编译器 / Next.js 构建系统 → 读取配置 → 解析模块 → 类型检查 → 生成类型声明 → IDE 智能提示和构建产物。

## 6. ChronosMirror 升级改进点

### 角色建模
- **类型安全约束**：当前 `strict: true` 已提供基础保障，但角色建模需要更严格的类型定义。建议在项目中创建 `src/types/character.ts`，定义角色类型接口（Character、CharacterRelation、CharacterState），利用 TypeScript 的 discriminated union 确保角色状态转换的类型安全。
- **路径别名扩展**：当前只有 `@/*`，角色建模可能需要更多别名如 `@characters/*`、`@timeline/*` 来组织复杂模块。

### 时间轴校验
- **时间类型定义**：时间轴校验需要精确的日期类型处理。建议考虑引入 `temporal` polyfill（TC39 Stage 3）或自定义严格的日期范围类型，确保历史时间点的类型安全。可以在 tsconfig 中通过 `types` 字段引入必要的类型声明。
- **JSON Schema 类型生成**：如果时间轴数据来自外部（如 MCP 维基百科），可以用 JSON Schema 生成 TypeScript 类型，确保数据流入时的类型安全。

### MCP 维基百科
- **API 响应类型**：MCP 维基百科集成会产生大量外部 API 响应，需要在 `src/types/` 中定义完整的响应类型接口。建议启用 `resolveJsonModule: true`（已启用）并创建对应的类型声明文件。
- **类型声明文件**：如果使用自定义 MCP 客户端，需要在 tsconfig 的 `include` 中确保类型声明文件被正确包含。

### 节奏控制
- **泛型约束**：节奏控制算法可能涉及复杂的泛型操作（如基于段落类型的处理策略）。当前的 TypeScript 配置已支持完整泛型，但建议在项目级别定义清晰的类型契约。
- **枚举与常量**：叙事节奏模式（快速推进、慢速铺陈、高潮爆发）应定义为 TypeScript 枚举或 `as const` 对象，配合类型推导提供智能提示。

### 总体改进建议
1. 考虑启用 `noUncheckedIndexedAccess` 以增强数组/对象访问的安全性
2. 为 ChronosMirror 新模块添加专属路径别名
3. 引入 `strictNullChecks` 确保角色状态不存在 undefined 风险
4. 考虑 `verbatimModuleSyntax` 以更好地控制 ES Module 导入/导出
