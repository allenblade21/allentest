# 记账本 · Ledger

个人记账 Web 应用。核心是 **OCR 批量记账**——把支付宝/微信账单截图、银行明细、纸质小票直接变成账目,省去手动录入;并规划基金投资的跨期收益追踪。手机优先,单用户自托管,数据归属自己。

> 状态:P0 基础记账已完成并有端到端测试覆盖;P1 基金模块开发中。

## 功能

| 优先级 | 模块 | 状态 |
|--------|------|------|
| P0 | 手动记一笔(数字键盘、分类宫格、账户/日期/备注) | ✅ |
| P0 | 编辑 / 删除账目 | ✅ |
| P0 | 批量修改(多选 → 改分类/账户/日期/删除,一次撤销) | ✅ |
| P0 | OCR 单张 + 批量导入(待确认清单、去重、商户映射学习) | ✅ |
| P0 | 月度汇总、按日分组流水、月份切换 | ✅ |
| P1 | 基金记账:持仓截图 OCR、同名基金按代码归一、跨期涨跌幅表 + 走势图、投资总览、手动记/补录/删除 | ✅ |
| P2 | 消费分析(环比 / 月度趋势 / 分类结构) | ✅ |
| P3 | 预算体系(分类月度限额、执行进度、超支提醒) | ✅ |
| P3 | 周期支出 / 异常检测 / 月度报告 / 净资产 / 备份([路线图](docs/路线图.md)) | ⬜ 规划中 |

详细需求见 [`docs/需求文档.md`](docs/需求文档.md),界面线框见 [`docs/wireframes.html`](docs/wireframes.html)。

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Next.js(App Router)+ TypeScript |
| 样式 | Tailwind CSS,手机优先响应式 |
| 数据库 | SQLite + Drizzle ORM(单文件,备份=拷文件) |
| OCR | 视觉大模型,截图直接转结构化 JSON;多 provider 可切换 |
| 金额 | 整数「分」存储,避免浮点误差 |

选型理由与被否方案见 [`docs/技术选型.md`](docs/技术选型.md)。

## 快速开始

前置:Node.js ≥ 20。

```bash
# 1. 安装依赖
npm install

# 2. 建库 + 写入默认分类与账户
npm run db:migrate
npm run db:seed

# 3. 配置环境变量(OCR 用)
cp .env.example .env.local
#   编辑 .env.local 填入 OCR 相关配置,见下方「OCR 配置」

# 4. 启动
npm run dev            # http://localhost:3000
```

手机测试:与电脑连同一 WiFi,访问 `http://电脑IP:3000`。

> 不想配 Key 也能先跑:在 `.env.local` 设 `OCR_MOCK=1`,OCR 会返回样例数据。

## OCR 配置

所有识别结果都会先进入「待确认清单」,经人工校对后才入账——识别错误不会污染账本。通过 `OCR_PROVIDER` 切换识别引擎:

| `OCR_PROVIDER` | 引擎 | 需要的变量 |
|----------------|------|-----------|
| `claude`(默认) | Anthropic 视觉模型 | `ANTHROPIC_API_KEY`(可选 `OCR_MODEL`) |
| `byteplus` | 火山引擎海外版 ModelArk | `ARK_API_KEY`(默认模型 Seed-2.0-lite,可选 `ARK_MODEL_ID`) |
| —(mock) | 固定样例,不调 API | 设 `OCR_MOCK=1` |

各变量含义见 [`.env.example`](.env.example)。API Key 只放服务端,`.env.local` 已被 git 忽略。

## 测试

端到端测试基于 Playwright(手机视口 + 独立测试库 + OCR mock,不触碰开发数据)。

```bash
npm test              # 构建 + 全量 E2E(19 例)
npm run test:quick    # 复用已有构建,快速跑
npm run test:list     # 列出全部用例
npm run test:report   # 打开 HTML 报告(含每用例截图、失败 trace)
npx playwright test -g "TC-B3"        # 按编号跑单个用例
npx tsx tests/ocr-provider.mjs        # OCR provider 单测(7 例,mock fetch)
```

用例登记表见 [`docs/测试用例.md`](docs/测试用例.md),TC 编号与 spec 标题一一对应。新增功能须同步补用例。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` / `build` / `start` | 开发 / 构建 / 生产启动 |
| `npm run db:generate` | 由 schema 生成迁移 |
| `npm run db:migrate` / `db:seed` | 执行迁移 / 写入默认数据 |
| `npm run lint` | ESLint |

## 目录结构

```
src/
├── app/
│   ├── (tabs)/        # 带底部导航:流水首页 / funds / me
│   ├── record/        # 记一笔(全屏)
│   ├── import/        # OCR 批量导入
│   └── api/           # transactions(含 batch/restore)/ ocr(含 confirm)/ funds
├── components/        # BottomNav / RecordForm / ImportFlow / TransactionList
├── db/                # schema(7 表)/ index / seed
└── lib/               # ocr(多 provider)/ money / date / tx-validate
tests/                 # Playwright E2E + OCR provider 单测
drizzle/               # 迁移 SQL 与元数据
docs/                  # 需求文档 / 技术选型 / 测试用例 / 界面线框
```

数据表:`transactions` `categories` `accounts` `funds` `fund_records` `ocr_import_batches` `merchant_rules`。

## 文档索引

**规范**
- [需求文档](docs/需求文档.md) — 功能需求、数据模型、页面结构
- [技术选型](docs/技术选型.md) — 技术栈决策与取舍
- [测试用例](docs/测试用例.md) — E2E 用例登记表
- [界面线框图](docs/wireframes.html) — 6 屏低保真线框
- [页面流程图](docs/页面流程图.svg) — 页面流转 user flow(可导入 Figma 编辑)

**记忆与过程**
- [决策记录 ADR](docs/adr/) — 关键决策及原因(长期记忆)
- [经验教训](docs/memory/lessons.md) — 踩过的坑与约定
- [迭代复盘](docs/journal/) — 每轮做了什么/遇到什么
- [变更日志](CHANGELOG.md) — 按里程碑的变更记录
- [进度看板](docs/STATUS.md) — 当前进度、待办、阻塞
- [路线图](docs/路线图.md) — P3 / P4 演进规划

**Agent 协作**
- [AGENTS.md](AGENTS.md) — 任何 agent 的共享入口(铁律 + 信息地图 + 工作流)
- [CLAUDE.md](CLAUDE.md) — Claude Code 工具特定说明

---

个人自用项目。数据本地/自托管,支持导出 CSV。
