#!/usr/bin/env bash
# MacBook 自动部署(拉取式):main 有新提交才 更新依赖 → 迁移 → 构建 → 重启;构建失败自动回滚上一版
# 由 launchd(com.jizhangben.deploy,每 10 分钟)调用,也可手动执行:bash scripts/auto-deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
log() { echo "[$(date '+%F %T')] $*"; }

git fetch origin main --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
[[ "$LOCAL" == "$REMOTE" ]] && exit 0

log "发现新版本 ${LOCAL:0:7} → ${REMOTE:0:7},开始部署"
git reset --hard origin/main --quiet

deploy() { npm ci --no-audit --no-fund && npm run db:migrate && npm run build; }

if deploy; then
  launchctl kickstart -k "gui/$(id -u)/com.jizhangben.app" 2>/dev/null || log "提示:服务未注册,跳过重启(先跑 macos-setup-server.sh)"
  log "✅ 已上线 ${REMOTE:0:7}"
else
  log "❌ 新版本构建失败,回滚到 ${LOCAL:0:7}(数据库迁移不回退,新迁移均为增量设计)"
  git reset --hard "$LOCAL" --quiet
  deploy && launchctl kickstart -k "gui/$(id -u)/com.jizhangben.app" 2>/dev/null || true
  exit 1
fi
