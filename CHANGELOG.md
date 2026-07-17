# 变更日志

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。项目尚未正式发版,下列按功能里程碑记录。

## [未发布]

### 新增
- P4 访问保护(ADR 0012):登录 + 注册(ALLOW_REGISTER=0 可关)、HttpOnly 会话(scrypt 密码、库存 sha256 token 可吊销)、Next 16 proxy.ts 中央守卫(页面 302 /login、API 401,新路由默认受保护)、「我的」显示用户名与退出登录;新表 users/sessions(迁移 0003);新增 TC-AU 测试组 6 例,E2E 默认注入固定测试会话。
- P4 部署套件(macOS 家用服务器,ADR 0011):npm run setup 一键环境搭建;scripts/macos-setup-server.sh(launchd 开机自启+崩溃拉起+每日 03:30 自动备份);npm run backup(SQLite 在线备份+OCR 原图,轮转保留 30 份);docs/部署.md 部署指南(Tailscale 内网访问、防休眠、恢复、升级)。
- P3 周期支出:登记订阅/房租等固定支出(新表 recurring,ADR 0010);/recurring 管理页;流水候选识别(近 3 个自然月同名同金额)一键采纳;「记一笔」自动入账并顺延下一期;到期前 7 天/过期首页提醒卡;新增 TC-RC 测试组 5 例。
- P3 预算体系:分类常设月度额度(新表 budgets,ADR 0009);/budget 设置页;分析页执行进度(≥80% 预警、超支标红);首页超支提醒卡;新增 TC-BG 测试组 5 例。
- P3/P4 路线图(docs/路线图.md)。
- P2 消费分析:环比(本月 vs 上月)、近 6 月支出趋势柱状、当月支出分类结构条形;入口「我的 → 消费分析」;新增 TC-A 测试组 4 例。
- 页面流程图(docs/页面流程图.svg,可导入 Figma 编辑)。
- P1 基金模块:持仓截图 OCR 批量录入、同名基金按代码归一(同日覆盖)、投资总览、基金详情(跨期涨跌幅表 + 市值走势图 + 持有期汇总)、手动记/补录/删除快照;新增 TC-F 测试组 7 例。
- 文档/记忆体系标准化:AGENTS.md 共享入口、docs/adr 决策记录、docs/STATUS 看板、docs/memory 经验库、docs/journal 复盘、CHANGELOG。
- OCR 接入 BytePlus Skylark-vision(火山引擎海外版 ModelArk),多 provider 适配,默认模型 Seed-2.0-lite。
- 流水批量修改:多选 → 改分类/账户/日期/删除,一次撤销。
- Playwright 端到端测试套件(19 例,TC-N/T/O/B)+ OCR provider 单测(7 例);测试管理入口(test / test:quick / test:list / test:report)。
- OCR 批量导入:识别 → 待确认清单(去重、存疑标记)→ 入账;商户→分类映射学习。
- 记一笔表单、编辑/删除、流水首页月度汇总与按日分组。
- 项目脚手架:Next.js + SQLite/Drizzle,7 表 schema、迁移与 seed。
- 需求文档、技术选型、测试用例、界面线框图。

### 变更
- 交互演示版对齐真实应用全功能(登录注册/分析/预算/周期支出),并重做账目编辑交互:prompt 弹窗 → 底部编辑面板(改金额/分类 + 独立删除键);周期支出新增改为正式表单;演示源文件与维护约定入库(docs/demo/、docs/演示版.md)。
- README 从脚手架模板重写为项目实际说明。
- CLAUDE.md 精简为 Claude 工具说明,决策/约定迁往 AGENTS.md 与 docs/adr。

### 修复
- 批量删空后空状态分支吞掉撤销 toast(由 TC-B3 发现)。

## 里程碑对照(时间线)

详见 [`docs/journal/`](docs/journal/) 逐迭代复盘。

1. 需求与设计(需求文档 + 技术选型 + 线框图)
2. 项目脚手架
3. 记账表单 + 流水首页
4. OCR 批量导入
5. Playwright 测试套件
6. 批量修改 + 撤销
7. OCR 接入 BytePlus
8. README 重写 + 文档/记忆体系标准化
