# Timeline 页面优化方案（讨论稿）

本文档基于现有实现：
- 页面：[TimelinePage.tsx](file:///l:/Web/Chamber%20tracker/src/pages/TimelinePage.tsx)
- 组件：[ScrollingTimeline.tsx](file:///l:/Web/Chamber%20tracker/src/components/ScrollingTimeline.tsx)
- 样式：[ScrollingTimeline.module.css](file:///l:/Web/Chamber%20tracker/src/components/ScrollingTimeline.module.css)

目标是让 Timeline 在“视觉语言、控件规格、信息层级、交互密度、性能”上与全站一致，并给出分阶段落地路线，方便我们逐步推进。

## 1. 现状观察（导致“不统一”的根因）

### 1.1 颜色与 tokens 来源不一致
- TimelinePage 顶部标题条使用硬编码 `#fff/#eee/#1976d2`，与全站 theme 没有绑定。
- ScrollingTimeline 内部 status 色板 `getBarStylingByEffectiveStatus` 是单独的一套硬编码色，与 theme 的 `success/warning/info/error` 不同。
- CSS module 里 weekend/holiday 背景、网格线、bar 阴影/圆角均为独立定义，视觉上很难跟随全站设计系统演进。

### 1.2 交互密度与信息表达不稳定
- bar 内文本与删除按钮常驻，会在数据密集时形成噪音；hover/聚焦态的信息层级还可以更清晰。
- 缺少“图例 + 筛选/缩放/跳转”的统一工具条；用户需要靠滚动/肉眼寻找。

### 1.3 性能与可维护性风险
- 时间轴横向日期列可扩展（monthsBefore/monthsAfter），DOM 容量增长后容易卡顿。
- CSS module + TS inline style 混用，后续迭代一致性成本高（改一处颜色要改多份文件）。

## 2. 设计目标（验收标准）
- **一致性**：颜色、圆角、阴影、字体层级、输入控件规格与全站一致（以 theme 为单一来源）。
- **可读性**：状态信息明确、密集数据下仍可快速定位；标题/工具条/主体有明确层级。
- **可操作性**：筛选、跳转、缩放、图例清晰；危险操作（删除/变更状态）均有一致的确认体验。
- **性能**：大范围时间与大量条形数据仍可用（至少不明显掉帧）。

## 3. 推荐的版式结构（信息架构）

### 3.1 页面 chrome（顶部区域）
建议 TimelinePage 顶部使用与其它页面一致的结构（可复用 PageShell 的“标题 + actions”语义），但保持全宽布局：

1) 标题行（高度紧凑）
- 左：标题“时间轴视图”
- 右：主操作“登记新使用记录”
- 颜色与分割线全部使用 theme：`background.paper`、`divider`、`primary`

2) 工具条（可折行）
- 筛选：状态（多选 Chip/Select）、环境箱、项目、测试项目
- 时间：快速跳转今天 / 日期范围（可选：只做“跳转今天 + 前后周切换”）
- 视图：缩放（DAY_WIDTH_PX 的档位，如 120/160/200/260）
- 图例：四种状态 chip（颜色同 bar）

### 3.2 主体（滚动容器）
建议保持现有“左侧 sticky 环境箱列 + 顶部 sticky 日期行”的结构，但统一：
- header 与 body 的背景/边框/阴影从 theme 获取
- 网格线、周末/节假日底色从 theme 派生（alpha）

## 4. 视觉规范（与 theme 对齐）

### 4.1 Status 色板（建议）
将 `getBarStylingByEffectiveStatus` 改为从 theme 派生：
- completed：success
- in-progress：warning
- not-started：info（或 primary 的浅色）
- overdue：error

衍生规则：
- bar 背景：`alpha(color.main, 0.16)`
- bar 边框：`alpha(color.main, 0.32)`
- bar 文本：`color.dark` 或 `color.main`

这样能保证 Timeline 与全站 Chip/Alert 的语义颜色一致。

### 4.2 圆角/阴影/边框
- bar radius 与全站一致（使用 theme 的 `shape.borderRadius`，必要时取小一档如 8）
- 阴影从“重”改为“轻”（与 AppCard 统一），hover 只做轻微提升，不做强烈漂浮
- header 分割线、网格线：统一使用 `divider` 或 `alpha(text.primary, 0.06~0.12)` 档位

## 5. 交互改造建议

### 5.1 Bar 的信息结构
建议 bar 内文本分两层（密集时只展示主行）：
- 主行：项目/Config（优先）或使用人
- 副行：时间段（可选，hover 或 tooltip 展示）

删除按钮建议“hover 才出现”，减少常驻噪音。

### 5.2 快速定位能力
- 在工具条提供“只看超时/只看进行中”等快速筛选 chip
- “跳转今天”按钮：滚动到当前日期列
- 可选：搜索（按使用人/项目关键词）仅在数据量大时启用

### 5.3 危险操作一致性
- 删除/标记完成等操作均使用统一 ConfirmDialog（与列表页一致）

## 6. 性能路线（分阶段）

### 阶段 0（低风险，先统一观感）
- TimelinePage 顶部标题条去硬编码色，改用 theme
- status 色板与 weekend/holiday 背景从 theme 派生
- bar hover 与删除按钮显示策略优化

### 阶段 1（体验增强）
- 增加工具条：筛选 + 图例 + 缩放（DAY_WIDTH_PX 档位）
- 缩放实现：DAY_WIDTH_PX 由常量改为 state（或派生计算），并在渲染中统一使用

### 阶段 2（性能优化）
当 monthsBefore/monthsAfter 拉大或 usageLogs 很多时：
- 横向日期列 windowing（只渲染可视区附近的日期）
- 行渲染 memo 化（按 chamber 分组 + memoized rows）
- 滚动与计算的节流（requestAnimationFrame）

### 阶段 3（可维护性优化）
- 把 ScrollingTimeline.module.css 中“颜色/圆角/阴影/边框”替换为 theme tokens 或 CSS variables（由 theme 注入）
- 逐步减少“硬编码色 + 分散定义”的来源

## 7. 需要你确认的取舍点（讨论项）
- Timeline 顶部工具条：你希望偏“简洁”（少筛选项）还是“强管控”（筛选齐全）？\n+- DAY_WIDTH_PX 缩放：你希望给 3 档还是 5 档？\n+- Bar 信息：默认展示“项目/Config”还是“使用人”？\n+
只要你确认以上方向，我就可以按“阶段 0 → 阶段 1”的顺序开始落地改造。 \n+
