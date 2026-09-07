# ADR 0015 · BytePlus 云形态:ECS + systemd + SSH 发布管线(可选,与 ADR 0011 并列)

- 状态:已采纳(2026-09-07,用户要求"自动化发布到 BytePlus 云的管线")
- 关联:ADR 0011(MacBook 形态,仍为默认);`.github/workflows/deploy-byteplus.yml`、`scripts/byteplus-setup-server.sh`、`scripts/auto-deploy.sh`、[docs/部署-BytePlus.md](../部署-BytePlus.md)

## 背景

MacBook 形态依赖家里一台不关机的电脑;用户希望有云端选项,且 OCR/AI 已在用 BytePlus ModelArk(新加坡区)。SQLite 需要持久磁盘,serverless 不适配(同 ADR 0011),故云上形态选**单台 ECS 虚拟机**。

## 决策

1. **目标:BytePlus ECS(ap-southeast-1,Ubuntu 2C2G)**——与 ModelArk 同区,OCR 链路最近;VM 形态让 SQLite/备份/部署脚本全部复用。
2. **进程守护用 systemd**(service + 两个 timer:每日备份、每 10 分钟轮询部署),与 macOS launchd 三件套一一对应。
3. **发布双通道**:主通道 GitHub Actions `workflow_run`(CI 绿才触发)SSH 进 ECS 执行 `auto-deploy.sh`;兜底通道服务器端 10 分钟轮询同一脚本。两通道幂等(无新提交即退出),未配 secrets 时主通道安静跳过。
4. **`auto-deploy.sh` 泛化而非复制**:重启动作按 `uname` 分支(launchctl / `sudo -n systemctl`,后者由 sudoers 白名单免密),拉取/迁移/构建/回滚逻辑两形态共用一份。
5. **安全边界不变**:安全组只开 22,应用 3000 走 Tailscale 内网(不暴露公网的铁律延续);ARK_API_KEY 只存服务器 `.env.local`;GitHub secrets 只存 SSH 发布密钥,不存业务 Key。
6. **数据主权取舍**:账本数据落云盘是本形态的代价——文档诚实标注,靠磁盘加密选项 + 每日备份 + 异地同步保留"随时撤回自托管"的能力;默认推荐仍是 MacBook 形态。

## 被否方案

- **VKE/容器化**:单用户单实例,K8s 纯属超配;Docker 也未引入(与 ADR 0011 保持零容器)。
- **对象存储 TOS + 云数据库**:要改存储层,违背"SQLite 单文件、备份=拷文件"的简单性。
- **GitHub Actions 里 rsync 构建产物**:服务器端构建(git + npm ci)比传 .next 产物更简单且与轮询兜底同路径。
