# CLAUDE.md — Claude Code 工具说明

> **先读 [AGENTS.md](AGENTS.md)**:项目铁律、信息地图、工作流以那里为准。本文件只补充 Claude Code 特有的命令与约定。
> 决策原因见 [`docs/adr/`](docs/adr/),进度见 [`docs/STATUS.md`](docs/STATUS.md),经验教训见 [`docs/memory/lessons.md`](docs/memory/lessons.md)。

## 常用命令

- `npm run dev` — 启动开发服务器(http://localhost:3000)
- `npm run build` — 生产构建
- `npm run db:generate` — 由 schema 生成迁移
- `npm run db:migrate` — 执行迁移(生成/更新 `data/app.db`)
- `npm run db:seed` — 写入默认分类与账户
- `npm run lint` — ESLint
- `npm test` — 构建 + 全量 E2E;`npm run test:quick` 复用已有构建
- `npm run test:list` — 列出用例;`npm run test:report` — 打开 HTML 报告
- `npx tsx tests/ocr-provider.mjs` — OCR provider 单测(mock fetch)

## 目录结构

```
src/
├── app/
│   ├── (tabs)/        # 带底部导航:流水首页 / funds 基金 / me 我的
│   ├── record/        # 记一笔(全屏)
│   ├── import/        # OCR 批量导入
│   └── api/           # transactions(含 batch/restore/[id])/ ocr(含 confirm)/ funds
├── components/        # BottomNav / RecordForm / ImportFlow / TransactionList
├── db/                # schema.ts(7 表)、index.ts(连接)、seed.ts
└── lib/               # ocr(多 provider,交易+基金)、fund(计算)、fund-db(upsert)、money、date、tx-validate
data/                  # SQLite 数据库与 OCR 原图(git 忽略)
tests/                 # Playwright E2E + OCR provider 单测
docs/                  # 规范 + adr/ + memory/ + journal/ + STATUS
```

## Claude 特定提示

- 验证功能优先用真实浏览器驱动(Playwright),环境已预装 Chromium(`/opt/pw-browsers/chromium`),勿 `playwright install`。
- 涉及 Claude/Anthropic API 用法(如 OCR 的 Anthropic provider)时,先查 `claude-api` skill,勿凭记忆写模型 id/参数。
- 发布可视化产物用 Artifact;临时文件放 scratchpad,勿污染仓库。
