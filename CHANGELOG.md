# 变更日志

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。项目尚未正式发版,下列按功能里程碑记录。

## [未发布]

### 新增
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
