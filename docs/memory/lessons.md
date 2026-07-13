# 经验教训(Lessons)

踩过的坑与得到的约定。**一条一记,新坑往下追加。** 目的是别人(或未来的自己)接手时不再踩同一个坑。

## 前端 / React

- **全局 UI 别放在早退分支里。** `TransactionList` 早期在「无数据」分支直接 `return 空状态`,导致批量删空后撤销 toast 被吞掉——正是最需要撤销的场景(误删全部)。由测试 TC-B3 发现。约定:toast/模态等全局元素要在所有渲染路径都存在。
- 固定底部操作栏(批量栏 / 入账栏)切换视图时要显式隐藏,否则会**层叠遮挡**彼此的点击(演示版自测时 `confirmbar` 挡住 `batchbar` 的删除按钮)。

## 数据 / 金额

- 金额一律整数分(见 ADR 0002)。任何"看起来是一次性小工具函数"的金额格式化,都走 `lib/money.ts`,别就地手写。

## Next.js(版本较新)

- **route 文件不能 export 约定外的函数。** 把 `validate` 从 `api/transactions/route.ts` 导出给别处用会报错——校验逻辑抽到 `lib/tx-validate.ts` 共用。
- `create-next-app` 在目标目录**已有文件时会拒绝初始化**(CLAUDE.md 存在导致冲突);脚手架前先把已有文件挪走,建完再放回。
- 不用 `next/font` 拉 Google 字体:构建依赖外网,中文界面直接走系统字体栈更稳。

## 测试 / Playwright

- **建测试库要放在 `webServer.command` 里,不能放 `globalSetup`。** Playwright 先起 webServer 再跑 globalSetup,若在 globalSetup 建库,服务器启动时表还不存在 → `no such table`。改为 `tsx tests/setup-db.ts && next start`。
- `getByText` 命中多个元素会 **strict mode violation**(如"存疑"同时出现在说明文字和标签里)——用 `{ exact: true }` 或更精确的定位。
- 环境预装 Chromium 在 `/opt/pw-browsers/chromium`,配置里显式指 `executablePath`,**勿 `playwright install`**(会尝试联网下载)。
- better-sqlite3 开了 WAL,测试可在服务端之外并发读写测试库(helpers 里直接开库清数据)。

## OCR

- 视觉模型返回可能被 ```json``` 代码块围栏包裹,`parseRecords` 统一剥离围栏再 `JSON.parse`。
- byteplus(ModelArk)走 OpenAI 兼容 REST,`response_format: json_object` 不强制 schema,需在 prompt 里明确 JSON 结构;Claude 侧用 `output_config.format` 强约束。
- 模型 id 会随版本变,别硬编码猜测的带日期后缀;给默认值 + 环境变量可覆盖,精确 id 让用户从控制台/`GET /models` 取。

## 协作 / 环境

- 沙盒是临时环境,生成的 `.env.local` 等未入库文件用户本地拿不到——需要交付时用附件发送,或把内容贴出来让用户复制。
- Artifact 有严格 CSP:必须自包含(内联 CSS/JS、data URI),不能引外部资源。
