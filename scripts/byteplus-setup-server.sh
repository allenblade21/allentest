#!/usr/bin/env bash
# BytePlus ECS(Ubuntu)一键配置:Node 20 + systemd 常驻自启 + 每日备份 + 每 10 分钟兜底自动部署
# 在 ECS 上、仓库根目录执行:bash scripts/byteplus-setup-server.sh
# 前置与后续步骤见 docs/部署-BytePlus.md(安全组、Tailscale、GitHub 秒级发布均在文档)
set -euo pipefail

if [[ "$(uname)" != "Linux" ]]; then
  echo "本脚本只用于 Linux(BytePlus ECS);MacBook 请用 scripts/macos-setup-server.sh"; exit 1
fi
command -v sudo >/dev/null || { echo "需要 sudo"; exit 1; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="$(id -un)"
LOG_DIR="$APP_DIR/data/logs"
mkdir -p "$LOG_DIR"

# ---- 0) Node.js ≥ 20(缺失或过旧时经 NodeSource 安装) ----
NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/' || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  echo "安装 Node.js 20(NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
NODE_DIR="$(dirname "$(command -v node)")"
NPM_BIN="$(command -v npm)"

# ---- 1) 依赖 / 数据库 / 构建(幂等) ----
if [[ ! -d "$APP_DIR/node_modules" || ! -f "$APP_DIR/.env.local" ]]; then
  (cd "$APP_DIR" && "$NPM_BIN" run setup)
fi
if [[ ! -d "$APP_DIR/.next" ]]; then
  (cd "$APP_DIR" && "$NPM_BIN" run build)
fi

# ---- 2) systemd:应用常驻(开机自启 + 崩溃拉起) ----
sudo tee /etc/systemd/system/jizhangben.service >/dev/null <<EOF
[Unit]
Description=记账本 Ledger app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PATH=${NODE_DIR}:/usr/bin:/bin
ExecStart=${NPM_BIN} start -- -H 0.0.0.0 -p 3000
Restart=always
RestartSec=3
StandardOutput=append:${LOG_DIR}/app.log
StandardError=append:${LOG_DIR}/app.err.log

[Install]
WantedBy=multi-user.target
EOF

# ---- 3) systemd:每日 03:30 备份 ----
sudo tee /etc/systemd/system/jizhangben-backup.service >/dev/null <<EOF
[Unit]
Description=记账本每日备份

[Service]
Type=oneshot
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=PATH=${NODE_DIR}:/usr/bin:/bin
ExecStart=$(command -v node) ${APP_DIR}/scripts/backup.mjs
StandardOutput=append:${LOG_DIR}/backup.log
StandardError=append:${LOG_DIR}/backup.err.log
EOF
sudo tee /etc/systemd/system/jizhangben-backup.timer >/dev/null <<EOF
[Unit]
Description=记账本每日备份定时器

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# ---- 4) systemd:每 10 分钟兜底自动部署(不配 GitHub SSH 也能自动上线) ----
sudo tee /etc/systemd/system/jizhangben-deploy.service >/dev/null <<EOF
[Unit]
Description=记账本自动部署(拉取 main,失败回滚)

[Service]
Type=oneshot
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=PATH=${NODE_DIR}:/usr/bin:/bin
ExecStart=/bin/bash ${APP_DIR}/scripts/auto-deploy.sh
StandardOutput=append:${LOG_DIR}/deploy.log
StandardError=append:${LOG_DIR}/deploy.err.log
EOF
sudo tee /etc/systemd/system/jizhangben-deploy.timer >/dev/null <<EOF
[Unit]
Description=记账本自动部署定时器

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
EOF

# ---- 5) 部署脚本重启服务的免密授权(auto-deploy.sh 里的 sudo -n systemctl restart) ----
echo "${RUN_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart jizhangben" \
  | sudo tee /etc/sudoers.d/jizhangben-deploy >/dev/null
sudo chmod 440 /etc/sudoers.d/jizhangben-deploy

# ---- 6) 加载并启动(幂等) ----
sudo systemctl daemon-reload
sudo systemctl enable --now jizhangben.service jizhangben-backup.timer jizhangben-deploy.timer

echo
echo "✅ 已配置完成:"
echo "   · 应用常驻:jizhangben.service(端口 3000,开机自启,崩溃自动拉起)"
echo "   · 每日备份:jizhangben-backup.timer(03:30 → ${APP_DIR}/backups/,保留 30 份)"
echo "   · 自动部署:jizhangben-deploy.timer(每 10 分钟检查 main,新提交自动上线,失败回滚)"
echo "   · 日志:${LOG_DIR}/"
echo
echo "还需按 docs/部署-BytePlus.md 完成:"
echo "   1. 安全组只放行 22,不开 3000;装 Tailscale 后手机用 http://<ECS的Tailscale名称>:3000 访问"
echo "   2. .env.local 填 ARK_API_KEY(只放服务器,不进 git/GitHub)"
echo "   3. (可选)配 GitHub secrets 启用 CI 绿后秒级 SSH 发布"
echo
echo "常用命令:状态 systemctl status jizhangben | 重启 sudo systemctl restart jizhangben | 部署日志 tail -f ${LOG_DIR}/deploy.log"
