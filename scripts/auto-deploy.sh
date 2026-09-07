#!/usr/bin/env bash
# 自动部署(拉取式,macOS/Linux 通用):main 有新提交才 更新依赖 → 迁移 → 构建 → 重启;构建失败自动回滚上一版
# 触发方:macOS launchd(com.jizhangben.deploy)/ Linux systemd(jizhangben-deploy.timer)每 10 分钟兜底轮询,
#         或 GitHub Actions(deploy-byteplus.yml)在 CI 绿后 SSH 即时触发;也可手动执行:bash scripts/auto-deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
log() { echo "[$(date '+%F %T')] $*"; }

restart_app() {
  if [[ "$(uname)" == "Darwin" ]]; then
    launchctl kickstart -k "gui/$(id -u)/com.jizhangben.app" 2>/dev/null \
      || log "提示:launchd 服务未注册,跳过重启(先跑 macos-setup-server.sh)"
  else
    sudo -n systemctl restart jizhangben 2>/dev/null \
      || log "提示:systemd 服务未注册或无重启权限,跳过重启(先跑 byteplus-setup-server.sh)"
  fi
}

git fetch origin main --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
[[ "$LOCAL" == "$REMOTE" ]] && exit 0

log "发现新版本 ${LOCAL:0:7} → ${REMOTE:0:7},开始部署"
git reset --hard origin/main --quiet

deploy() { npm ci --no-audit --no-fund && npm run db:migrate && npm run build; }

if deploy; then
  restart_app
  log "✅ 已上线 ${REMOTE:0:7}"
else
  log "❌ 新版本构建失败,回滚到 ${LOCAL:0:7}(数据库迁移不回退,新迁移均为增量设计)"
  git reset --hard "$LOCAL" --quiet
  { deploy && restart_app; } || true
  exit 1
fi
