# OpenChat PC React 应用开发执行规范

## 项目概述

**应用名称**: OpenChat React PC 应用  
**项目路径**: `spring-ai-plus-business\apps\sdkwork-chat-pc-react`  
**技术栈**: React 18+、TypeScript 5+、Vite 5+、Tailwind CSS、Tauri  
**架构模式**: pnpm workspace 分包架构

## 核心架构原则

### 1. 分包架构规范

项目采用 `pnpm workspace` + 顶级 `packages/` 分包架构：

- **壳层 (src/)**: 仅保留应用启动、路由组装、平台适配，保持薄壳层
- **业务包**: `packages/sdkwork-openchat-pc-xxx`，每个业务域独立成包
- **基础三包**:
  - `@sdkwork/openchat-pc-contracts`: 共享契约层（types/contracts）
  - `@sdkwork/openchat-pc-kernel`: 核心能力层（env/api/core/services）
  - `@sdkwork/openchat-pc-ui`: UI 与体验层（ThemeProvider、基础 UI 组件）
  - `@sdkwork/openchat-pc-commons`: 兼容聚合层，统一转发基础三包

### 2. 包命名规范

- **目录名**: `packages/sdkwork-openchat-pc-xxx`
- **包名**: `@sdkwork/openchat-pc-xxx`
- **统一入口**: `src/index.ts`
- **业务域示例**: `im`, `chat`, `contacts`, `settings`, `wallet`, `agent`, `skill`, `tool` 等

### 3. 业务包标准结构

```
src/
  components/       # 业务组件
  pages/            # 页面组件
  services/         # 服务层（必须包含）
    index.ts        # 统一服务出口
    xxx.service.ts  # 服务实现
    sdk-adapter.ts  # SDK 适配器预留
  hooks/            # 自定义 hooks
  entities/         # 实体类型定义
  types/            # 类型定义
  index.ts          # 包公开 API
```

## 服务层接入规范（Service Interface Standard v2）

### 1. 服务层强制要求

1. **每个功能模块必须提供 `src/services`**
2. **统一服务入口**: `src/services/index.ts` 是唯一的稳定导入入口
3. **页面和 Hook 只能调用服务 API**，禁止直接调用 `fetch`
4. **包公开 API** (`src/index.ts`) 应直接导出服务
5. **SDK 适配预留**: 每个业务模块服务目录必须包含 `src/services/sdk-adapter.ts`

### 2. 服务层架构层级

```
pages/hooks
  -> services/index.ts (模块服务边界)
    -> service implementation (*.service.ts)
      -> sdk-adapter.ts / http client / storage
```

### 3. 双 API 策略（迁移期兼容）

- **传统 API**: 保持向后兼容的现有服务 API
- **标准化 API**: `*ResultService` 返回 `ServiceResult<T>`

```typescript
// 标准化服务结果类型
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  errorDetail?: unknown;
  message?: string;      // 兼容字段
  code?: number | string; // 兼容字段
  meta?: {
    source: 'sdk' | 'http' | 'local' | 'mock';
    timestamp: number;
  };
}
```

### 4. SDK 适配器规范

每个 `sdk-adapter.ts` 必须包含：

```typescript
export interface SDKAdapterBridge {
  kind: string;
  isAvailable(): boolean;
  // 预留扩展: invoke(method, payload)
}

export function registerSDKAdapter(adapter: SDKAdapterBridge): void;
export function getSDKAdapter(): SDKAdapterBridge | undefined;
```

## 开发工作流

### 1. 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev           # Web 应用
pnpm run dev:desktop   # Tauri 桌面应用

# 代码检查
pnpm run lint
pnpm run format
pnpm run typecheck           # 检查壳层
pnpm run typecheck:packages  # 检查所有包

# 测试
pnpm run test
pnpm run test:watch

# 架构验证
pnpm run verify:packages     # 包边界检查
pnpm run audit:services      # 服务层审计
pnpm run report:services     # 服务合规报告
pnpm run report:modules      # 模块就绪度报告

# 构建
pnpm run build
```

### 2. 代码规范

- **组件命名**: PascalCase，如 `ChatPage.tsx`
- **Hooks/工具**: camelCase，如 `useAuth.ts`
- **包间导入**: 使用包名导入，如 `@sdkwork/openchat-pc-commons`
- **禁止**: 包内使用 `@/` 或跨包 `/src/` 引用
- **类型检查**: 每个包必须能通过 `tsc --noEmit -p tsconfig.json`

### 3. 测试规范

- 测试文件命名: `*.test.ts`, `*.test.tsx`, `*.spec.tsx`
- 测试覆盖率目标: 核心包 80%+，业务包 70%+
- 提交前必须运行: `pnpm run test`, `pnpm run typecheck:packages`, `pnpm run verify:packages`

## 模块开发优先级

### 第一阶段：基础服务（高优先级）

1. **auth** - 认证授权
2. **contacts** - 联系人管理
3. **im** - 即时消息核心
4. **chat** - 聊天界面

### 第二阶段：核心功能

5. **settings** - 系统设置
6. **notification** - 通知中心
7. **wallet** - 钱包支付
8. **drive** - 云存储

### 第三阶段：扩展功能

9. **agent** - AI 助手
10. **skill** - 技能市场
11. **tool** - 工具市场
12. **commerce** - 电商商城
13. **video** - 短视频
14. **social** - 社交动态

### 第四阶段：其他模块

15. **appstore** - 应用商店
16. **discover** - 发现/搜索
17. **creation** - 内容创作
18. **terminal** - 终端/RTC
19. **device** - 设备管理

## 迭代开发流程

### 1. 单模块开发循环

```
1. 检查模块现有功能
   └─> 阅读 packages/sdkwork-openchat-pc-xxx/README.md
   └─> 检查 src/pages, src/services, src/components 完整性

2. 确保服务层规范
   └─> 创建/完善 src/services/index.ts
   └─> 创建/完善 src/services/xxx.service.ts
   └─> 创建/完善 src/services/sdk-adapter.ts
   └─> 实现 *ResultService 标准化 API

3. 页面与组件实现
   └─> 按业务需求实现 pages/
   └─> 提取可复用 components/
   └─> 使用标准化服务 API

4. 验证与测试
   └─> pnpm run typecheck:packages
   └─> pnpm run verify:packages
   └─> pnpm run test
   └─> pnpm run audit:services

5. 修复问题
   └─> 解决类型错误
   └─> 解决架构违规
   └─> 补充测试用例
```

### 2. SDK 集成模式

当需要接入后端 SDK 时：

1. 检查 `src/services/sdk-adapter.ts` 是否已实现 SDK 调用逻辑
2. 如 SDK 不满足业务需求：
   - 先修复后端 Java Controller 代码
   - 重新打包编译 `spring-ai-plus-server-application`
   - 启动新服务（端口 8080）
   - 生成新的 SDK
   - 更新前端适配器
3. 循环往复直至功能完整

## 质量门禁

### 提交前必须检查

- [ ] `pnpm run typecheck:packages` 无类型错误
- [ ] `pnpm run verify:packages` 无架构违规
- [ ] `pnpm run test` 测试通过
- [ ] `pnpm run lint` 无代码风格问题
- [ ] `pnpm run audit:services` 服务层合规

### 禁止事项

- 禁止在 `src/` 壳层添加业务逻辑
- 禁止包间通过相对路径越界访问
- 禁止页面/Hook 直接调用 `fetch`
- 禁止业务包导出 repository API
- 禁止跨包引用 `/src/` 内部文件

## 文档参考

- [AGENTS.md](../AGENTS.md) - 仓库开发规范
- [docs/service-interface-standard-v2.md](../docs/service-interface-standard-v2.md) - 服务接口标准
- [docs/package-architecture-standard.md](../docs/package-architecture-standard.md) - 分包架构标准
- [docs/prompt.md](../docs/prompt.md) - 迁移规范（历史参考）

## 当前状态检查

开发前请先运行以下命令了解当前项目状态：

```bash
# 查看模块就绪度报告
pnpm run report:modules

# 查看服务合规报告
pnpm run report:services

# 检查各包类型状态
pnpm run typecheck:packages
```
