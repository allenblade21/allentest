# AGENTS.md — Agent 协作共享入口

> 本文件是**任何** AI agent(Claude Code / 其他工具)在本仓库工作前**首先要读**的单一事实源。
> 人类看 [README.md](README.md);Claude Code 的工具特定说明见 [CLAUDE.md](CLAUDE.md),但铁律与地图以本文件为准。

## 一句话

个人记账 Web 应用,单用户自托管。核心卖点是 **OCR 批量记账**(截图 → 视觉大模型 → 结构化账目),规划基金投资追踪。

## 铁律(不可违背,勿再问)

1. **金额一律用整数「分」存储**,严禁浮点。展示层才转元(`src/lib/money.ts`)。
2. **所有 OCR 识别结果必须经用户在「待确认清单」确认后**才写入正式表——识别错误不得污染账本。
3. **改功能必须同步补/改测试**,并更新 [`docs/测试用例.md`](docs/测试用例.md)(TC 编号 ↔ spec 标题)。
4. **直接在 `main` 分支开发并推送**;合理默认自行决定,只在真正的方向性问题上才问用户。
5. **API Key 只放服务端环境变量**,`.env.local` 已 gitignore,严禁写入代码或提交。
6. **中文注释、中文 UI 文案;代码标识符用英文。**
7. 数据表:`transactions` `categories` `accounts` `funds` `fund_records` `ocr_import_batches` `merchant_rules` `budgets` `recurring` `users` `sessions`;`fund_records` 上 `(fund_code, date)` 唯一,`budgets.categoryId` 唯一(ADR 0009),`recurring` 存下次支付日按周期顺延(ADR 0010),认证为共享账本不按用户隔离(ADR 0012)。
8. **Next.js 版本较新,有 breaking changes**——API/约定可能与训练数据不同,写代码前参考 `node_modules/next/dist/docs/`,留意弃用提示。
9. **所有页面与 API 默认要求登录**(src/proxy.ts 中央守卫);新增公开路径必须显式加入 `lib/auth-shared.ts` 的 PUBLIC_PATHS。E2E 默认带固定测试会话(tests/test-session.ts),认证类用例需自行清空 storageState。

## 信息地图(去哪找什么)

| 想知道… | 看这里 |
|---------|--------|
| 该做什么、还没做什么、谁在做 | [`docs/STATUS.md`](docs/STATUS.md) ← 多 agent 同步点 |
| 未来阶段规划(P3/P4) | [`docs/路线图.md`](docs/路线图.md) |
| 功能需求(P0/P1/P2)、数据模型 | [`docs/需求文档.md`](docs/需求文档.md) |
| 技术栈决策与取舍 | [`docs/技术选型.md`](docs/技术选型.md) |
| **为什么当初这么决定** | [`docs/adr/`](docs/adr/) ← 决策记录(长期记忆) |
| **踩过什么坑、有什么教训** | [`docs/memory/lessons.md`](docs/memory/lessons.md) |
| **发生过什么、每轮复盘** | [`docs/journal/`](docs/journal/) |
| 变更历史 | [`CHANGELOG.md`](CHANGELOG.md) |
| 测试用例清单 | [`docs/测试用例.md`](docs/测试用例.md) |
| 界面长什么样 | [`docs/wireframes.html`](docs/wireframes.html) |
| 命令、Claude 工具用法 | [`CLAUDE.md`](CLAUDE.md) |

## 标准工作流(每次改动)

```
1. 读 docs/STATUS.md 了解当前进度与在办项
2. 改代码
3. 补/改测试 → npm run test:quick 跑绿(必须)
4. 同步文档:
   - 新功能 → 更新 docs/测试用例.md、docs/STATUS.md
   - 关键决策 → 新增一条 docs/adr/000N-*.md
   - 踩了坑/得了经验 → 追加 docs/memory/lessons.md
   - 迭代收尾 → 追加 docs/journal/ 复盘、CHANGELOG.md
5. commit(中文、说清做了什么+验证结果)并推送 main
```

## 当前状态

进度、在办、待办、阻塞项一律以 [`docs/STATUS.md`](docs/STATUS.md) 为准,不在本文件重复。
