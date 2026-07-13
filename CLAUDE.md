# CLAUDE.md

个人记账软件(单用户、自用)。AI 助手在本仓库工作时遵循本文件,**已定决策不要重复询问**。

## 已确认的决策(勿再问)

- **产品形态**:手机优先的响应式 Web 应用;单用户,无注册/登录体系
- **OCR 输入来源**:支付宝/微信账单截图、纸质小票/发票拍照、基金/证券 App 截图、银行账单截图
- **技术栈(方案 A,详见 docs/技术选型.md)**:
  - Next.js(App Router)+ TypeScript + Tailwind CSS
  - SQLite + Drizzle ORM(better-sqlite3),数据库文件在 `data/app.db`(不入库)
  - OCR/识别:视觉大模型 API,截图直接转结构化 JSON,不用传统 OCR。多 provider 适配(`src/lib/ocr.ts`),`OCR_PROVIDER=claude|byteplus` 切换:
    - `claude`(默认):Anthropic Messages API,`ANTHROPIC_API_KEY`,`output_config.format` 强约束 JSON
    - `byteplus`:火山引擎海外版 ModelArk(OpenAI 兼容 REST,原生 fetch),`ARK_API_KEY` + `ARK_MODEL_ID`(skylark-vision 接入点),`json_object` 模式
    - `OCR_MOCK=1`:返回样例数据,不调任何 API
  - 包管理:**npm**
  - 部署:待定,先按本地开发环境;API Key 只放服务端环境变量
- **需求基线**:`docs/需求文档.md`(P0 记账 / P1 基金 / P2 推荐功能占位);界面以 `docs/wireframes.html` 六屏线框为准
- **金额存储**:整数「分」,避免浮点误差
- **工作方式**:直接在 `main` 分支开发推送;合理默认自行决定,只在真正的方向性问题上才询问用户

## 常用命令

- `npm run dev` — 启动开发服务器
- `npm run build` — 生产构建
- `npm run db:generate` — 由 schema 生成迁移
- `npm run db:migrate` — 执行迁移(生成/更新 `data/app.db`)
- `npm run db:seed` — 写入默认分类与账户
- `npm run lint` — ESLint
- `npm test` — 构建 + 全量端到端测试;`npm run test:quick` 复用已有构建
- `npm run test:list` — 列出全部用例;`npm run test:report` — 打开 HTML 报告
- 测试用例登记表在 `docs/测试用例.md`,新增功能须同步补用例(TC-编号与 spec 标题对应)

## 目录结构

```
docs/                  # 需求文档、技术选型、线框图
src/
├── app/
│   ├── (tabs)/        # 带底部导航:流水首页 / funds 基金 / me 我的
│   ├── record/        # 记一笔(全屏)
│   ├── import/        # OCR 批量导入
│   └── api/           # API 路由:transactions / ocr / funds
├── components/        # BottomNav 等共用组件
├── db/                # schema.ts、index.ts(连接)、seed.ts
└── lib/               # 金额/日期工具
data/                  # SQLite 数据库与上传原图(git 忽略)
```

## 约定

- 中文注释与中文 UI 文案;代码标识符用英文
- 数据表:transactions / categories / accounts / funds / fund_records / ocr_import_batches / merchant_rules;`fund_records` 上 (fund_code, date) 唯一
- 所有 OCR 识别结果必须经用户确认后才写入正式表
