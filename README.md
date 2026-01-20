# 设备资产管理平台（Chamber Tracker）

这是一个基于 React + TypeScript + Vite 构建的前端项目，用于管理设备台账、使用记录（含时间线）、告警与维修工单。数据目前使用 Firebase Firestore 持久化，前端通过 Redux Toolkit 进行状态管理，并支持导出使用记录为 Excel。

线上地址（Firebase Hosting）：https://chamber-tracker-82406.web.app

## 核心功能

- 设备台账：设备信息维护、状态（可用/使用中/维护中）、校准日期管理（管理员）
- 使用记录：登记/编辑/完成/删除、详情查看、导出 Excel
- 时间线：按设备展示占用条形图，支持从时间线发起新建/查看/删除某配置维度记录
- 告警中心：校准到期提醒、逾期使用、长占用告警（阈值可配置）
- 维修管理：工单创建、状态流转（询价/待维修/完成），并联动资产状态（管理员）
- 设置：主题/密度/主色，Dashboard 默认时间窗，告警阈值，自动刷新，数据迁移
- 数据迁移：旧 `chambers` 集合一键迁移到新 `assets` 集合（管理员）

## 技术栈

- 前端：React 18 + TypeScript
- 构建：Vite 5
- UI：Material UI（@mui/material + @mui/icons-material + @mui/x-date-pickers）
- 状态管理：Redux Toolkit + react-redux
- 数据：Firebase Firestore（`src/services/*`）
- 导出：xlsx（使用记录导出）

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 类型检查 / 构建 / 测试

```bash
npm run typecheck
npm run build
npm run test
```

## 部署（Firebase Hosting）

项目已配置 `firebase.json` 使用 `dist` 作为静态资源目录，并包含 SPA rewrite。

```bash
npm run build
npx firebase-tools deploy --only hosting
```

部署目标项目由 `.firebaserc` 指定默认 Firebase Project。

## 配置说明

- Firebase 初始化在 [firebase-config.ts](file:///l:/Web/Chamber%20tracker/src/firebase-config.ts) 中完成，并导出 `db/auth/functions`。
- 当前项目的“登录/权限”是前端本地模拟：用户信息保存在 localStorage（见 [authSlice.ts](file:///l:/Web/Chamber%20tracker/src/store/authSlice.ts)）。如需对接真实企业账号体系，建议切换为 Firebase Auth 或自建后端鉴权。

## 项目结构（简要）

- `src/pages/`：各业务页面（Dashboard、Timeline、Alerts、UsageLogs、Chambers、Repairs、Settings…）
- `src/components/`：可复用组件（表单、列表、时间线渲染、导航中心等）
- `src/store/`：Redux slices、selectors（KPI/告警派生）、store 配置
- `src/services/`：对 Firestore 的读写封装、迁移/对账等服务
- `src/utils/`：状态判定、导出等工具函数

## 重要业务口径（避免“状态不同步”）

项目中“使用记录是否占用设备”的判定统一复用：
- `isUsageLogOccupyingAsset`：[statusHelpers.ts](file:///l:/Web/Chamber%20tracker/src/utils/statusHelpers.ts)

并在拉取使用记录后自动对账回填资产状态：
- `reconcileAssetStatusesFromUsageLogs`：[assetStatusReconcileService.ts](file:///l:/Web/Chamber%20tracker/src/services/assetStatusReconcileService.ts)

