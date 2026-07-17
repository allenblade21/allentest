# STATUS — 进度看板

> 多 agent / 跨会话的实时同步点。**开工先读这里,收尾更新这里。**
> 最后更新:2026-07-16

## 当前焦点

P4「访问保护」已完成(登录+注册,ADR 0012)。下一步:P3 迭代 3「净资产总览 + 月度报告」(见路线图)。

## 已完成 ✅

- **P0 基础记账**(全部):手动记一笔、编辑/删除、批量修改(+撤销)、OCR 单张+批量导入(去重、存疑、商户映射学习)、月度汇总、按日分组、月份切换
- **P1 基金记账与投资管理**(全部):持仓截图 OCR、同名基金按代码归一、投资总览、详情(跨期涨跌幅表+走势图+汇总)、手动记/补录/删除
- **P2 消费分析**:环比(本月 vs 上月)、近 6 月支出趋势柱状、当月支出分类结构条形;入口在「我的 → 消费分析」(`/analysis`)
- **P3 预算体系**:分类常设月度额度(ADR 0009,新表 `budgets`);`/budget` 设置页;分析页执行进度条(≥80% 预警、超支标红);首页超支提醒卡(点击进分析)
- **P3 周期支出**:登记订阅/房租等固定支出(ADR 0010,新表 `recurring`);`/recurring` 管理页;流水候选识别(近 3 个自然月同名同金额)一键采纳;「记一笔」自动入账并顺延;到期前 7 天/过期首页琥珀提醒卡
- **OCR 多 provider**:claude / byteplus(默认 Seed-2.0-lite)/ mock;交易与基金识别共用 callVision
- **测试**:Playwright E2E 40 例(TC-N/T/O/B/F/A/BG/RC)+ OCR provider 单测 7 例
- **P4 访问保护**:登录 + 注册(可 `ALLOW_REGISTER=0` 关闭)、HttpOnly 会话(库存 sha256,可吊销)、`proxy.ts` 中央守卫(未登录页面→/login、API→401,新路由默认受保护)、「我的」显示用户+退出登录;共享账本不按用户隔离(ADR 0012,新表 `users` `sessions`)
- **P4 部署套件(macOS)**:`npm run setup` 一键搭建;`scripts/macos-setup-server.sh`(launchd 常驻自启 + 每日 03:30 自动备份);`npm run backup`(SQLite 在线备份 + OCR 原图,保留 30 份);[docs/部署.md](部署.md) 指南;形态=MacBook 常开 + Tailscale 内网(ADR 0011)
- **文档/记忆体系**:规范 + adr + memory + journal + STATUS + README + 页面流程图 SVG

## 进行中 🔧

- 无

## 待办 ⬜

> P3 / P4 完整演进规划见 [路线图.md](路线图.md)。

- **P3 剩余**:净资产总览 + 月度报告(迭代 3)、异常检测 + 数据备份(迭代 4)
- P4 部署剩余:PWA 加主屏/离线壳
- 可选增强:基金快照行内编辑、流水搜索/筛选 UI、分类/账户管理页(当前「我的」为入口占位)

## 阻塞 / 待用户 🚧

- 用户需在 `.env.local` 填 `ARK_API_KEY` 并在 ModelArk 控制台开通 Seed-2.0-lite,才能实测 BytePlus 真实识别;当前演示/测试用 mock。

## 关键指标

- 测试:46 E2E(TC-N 2 / TC-T 7 / TC-O 5 / TC-B 5 / TC-F 7 / TC-A 4 / TC-BG 5 / TC-RC 5 / TC-AU 6)+ 7 单测,最近一次全绿
- 数据表:11(新增 users、sessions);E2E 用例组:9
