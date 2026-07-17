#!/usr/bin/env bash
# macOS 家用服务器一键配置:launchd 常驻自启 + 每日自动备份
# 在 MacBook 上、仓库根目录执行:bash scripts/macos-setup-server.sh
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "本脚本只用于 macOS(在你的 MacBook 上运行)"; exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)" || { echo "未找到 node,请先安装 Node.js ≥ 20"; exit 1; }
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$NODE_BIN")"
AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$APP_DIR/data/logs"
mkdir -p "$AGENTS_DIR" "$LOG_DIR"

if [[ ! -d "$APP_DIR/.next" ]]; then
  echo "还没构建过,先执行 npm run build ..."
  (cd "$APP_DIR" && "$NPM_BIN" run build)
fi

# ---- 1) 应用常驻:开机自启 + 崩溃自动拉起 ----
APP_PLIST="$AGENTS_DIR/com.jizhangben.app.plist"
cat > "$APP_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.jizhangben.app</string>
  <key>ProgramArguments</key><array>
    <string>${NPM_BIN}</string><string>start</string><string>--</string>
    <string>-H</string><string>0.0.0.0</string><string>-p</string><string>3000</string>
  </array>
  <key>WorkingDirectory</key><string>${APP_DIR}</string>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>NODE_ENV</key><string>production</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${LOG_DIR}/app.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/app.err.log</string>
</dict></plist>
EOF

# ---- 2) 每日 03:30 自动备份到 backups/ ----
BAK_PLIST="$AGENTS_DIR/com.jizhangben.backup.plist"
cat > "$BAK_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.jizhangben.backup</string>
  <key>ProgramArguments</key><array>
    <string>${NODE_BIN}</string><string>${APP_DIR}/scripts/backup.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>${APP_DIR}</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>${LOG_DIR}/backup.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/backup.err.log</string>
</dict></plist>
EOF

# ---- 3) 加载(先卸载旧的,幂等) ----
for plist in "$APP_PLIST" "$BAK_PLIST"; do
  launchctl unload "$plist" 2>/dev/null || true
  launchctl load -w "$plist"
done

echo
echo "✅ 已配置完成:"
echo "   · 应用常驻:com.jizhangben.app(端口 3000,开机自启,崩溃自动拉起)"
echo "   · 每日备份:com.jizhangben.backup(03:30 → ${APP_DIR}/backups/,保留 30 份)"
echo "   · 日志:${LOG_DIR}/"
echo
echo "还需手动做两件事:"
echo "   1. 防休眠(插电时不睡):sudo pmset -c sleep 0"
echo "      (合盖会断服务——建议开盖放家里,或外接显示器)"
echo "   2. 手机随时访问:MacBook 和手机都装 Tailscale 并登录同一账号,"
echo "      手机浏览器访问 http://<MacBook的Tailscale名称>:3000"
echo
echo "常用命令:重启服务 launchctl kickstart -k gui/\$(id -u)/com.jizhangben.app"
echo "          查看状态 launchctl list | grep jizhangben"
