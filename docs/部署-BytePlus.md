# 部署指南 — BytePlus 云(ECS,可选形态)

> 不想家里常开 MacBook 时的云端形态:一台 BytePlus ECS(Ubuntu)常驻,GitHub push 后 **CI 全绿 → 自动发布**。
> 与 [MacBook 形态](部署.md)(ADR 0011)二选一或并存;取舍与安全边界见 [ADR 0015](adr/0015-BytePlus云形态.md)。
> ⚠️ 本文步骤已通过脚本静态检查与工作流跳过路径实测,**ECS 实机操作待确认**(有出入请回报,惯例同 Termux 文档)。

## 何时选这条路线

| | MacBook(默认) | BytePlus ECS(本文) |
|---|---|---|
| 前提 | 家里有台不关机的 Mac | 无,10 分钟开一台 |
| 费用 | 0 | 约 $5–10/月(2C2G) |
| 数据位置 | 自己硬盘 | 云盘(见文末隐私说明) |
| 可用性 | 停电/合盖即断 | 机房级 |
| OCR 延迟 | 出国到 ModelArk | 同区(新加坡)更近 |

## 管线全景

```
git push → GitHub Actions CI(lint + 构建 + 全量测试)
        └─ 绿 → Deploy BytePlus workflow SSH 进 ECS → auto-deploy.sh(拉取→迁移→构建→重启,失败回滚)
ECS 本机:jizhangben-deploy.timer 每 10 分钟轮询 main 兜底(不配 SSH 发布也能自动上线)
        + jizhangben-backup.timer 每日 03:30 备份
```

## 一、开一台 ECS(约 10 分钟)

1. [console.byteplus.com](https://console.byteplus.com) → **ECS** → 创建实例:
   - 区域:**ap-southeast-1(新加坡)**——与 ModelArk 同区,OCR/AI 调用最近;
   - 镜像:**Ubuntu 22.04/24.04**;规格:2C2G 起(构建 Next.js 需要,1G 会 OOM);
   - 系统盘 40G;带宽按量或 1–5 Mbps 均可。
2. **安全组(关键)**:入方向**只放行 22(SSH)**,建议限定为你的出口 IP;**不要放行 3000**——应用访问走 Tailscale(下一步),延续"不暴露公网"铁律。
3. 用控制台下发的密钥/密码 SSH 登录。

## 二、装 Tailscale(推荐,手机随时访问)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up        # 按提示用与手机相同的账号登录授权
```

手机端与 [安卓端设置](部署-安卓端.md) 完全相同,只是地址换成 `http://<ECS的Tailscale名称>:3000`。

## 三、拉代码(只读 Deploy Key)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_repo -N ""
cat ~/.ssh/id_repo.pub   # 复制输出
# GitHub 仓库 → Settings → Deploy keys → Add:粘贴,不勾 write 权限
git config --global core.sshCommand "ssh -i ~/.ssh/id_repo"
git clone git@github.com:allenblade21/allentest.git ~/allentest
```

## 四、一键配置服务器

```bash
cd ~/allentest && bash scripts/byteplus-setup-server.sh
nano .env.local          # 填 ARK_API_KEY(只放服务器,永不进 git/GitHub)
sudo systemctl restart jizhangben
```

脚本幂等可重跑,完成后:应用常驻(`jizhangben.service`)+ 每日备份 + 每 10 分钟轮询自动部署。到这一步**管线已可用**——push 合入 main 后十分钟内自动上线。

## 五、(可选)CI 绿后秒级发布

想把"十分钟内"变成"CI 绿后立刻":

1. ECS 上生成**专用发布密钥**并授权本机登录:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ci_deploy -N ""
   cat ~/.ssh/id_ci_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/id_ci_deploy    # 私钥,下一步用
   ```
2. GitHub 仓库 → Settings → Secrets and variables → Actions,新建:

   | Secret | 值 |
   |--------|----|
   | `BP_HOST` | ECS 公网 IP |
   | `BP_SSH_KEY` | 上面的私钥全文 |
   | `BP_USER` | 登录用户(默认 root) |
   | `BP_PORT` / `BP_APP_DIR` | 可选,默认 22 / `~/allentest` |

之后每次 push:CI 绿 → `Deploy BytePlus` workflow 自动 SSH 发布。未配 secrets 时该 workflow 安静跳过,不算失败。

## 备份与容灾

- `backups/` 每日 03:30 一份(SQLite 在线备份 + OCR 原图,保留 30 份),恢复步骤同 [部署.md「备份与恢复」](部署.md)(把 launchctl 换成 `sudo systemctl restart jizhangben`);
- 云上建议再加一层异地:`rclone` 把 `backups/` 同步到 TOS/网盘,或定期 `scp` 回自己电脑。

## 故障排查

| 现象 | 查什么 |
|------|--------|
| 服务没起来 | `systemctl status jizhangben`;`tail -50 data/logs/app.err.log` |
| 推了代码没上线 | Actions 页看 CI 与 Deploy 两个 workflow;`tail -50 data/logs/deploy.log` 看是否构建失败已回滚 |
| Deploy workflow 红 | SSH 不通:安全组 22、`BP_HOST`/密钥是否对;`accept-new` 首次会自动记 host key |
| 构建 OOM | 规格升到 2G 内存以上,或加 swap:`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| 手机连不上 | 两端 Tailscale 在线且同账号;安全组不需要为 Tailscale 开任何端口 |

## 数据与隐私(诚实说明)

账本数据(SQLite 文件、OCR 原图)落在 BytePlus 云盘上——物理介质不再归你,这是与 MacBook 形态的本质差异。缓解:磁盘可在创建时勾选加密;`ARK_API_KEY` 仍只存服务器 `.env.local`;应用端口不对公网开放(Tailscale 内网);每日备份 + 异地同步让你随时可以整体撤回自托管。介意这一点就留在 [MacBook 形态](部署.md)。
