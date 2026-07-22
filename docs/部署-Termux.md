# Termux 部署详细步骤 — 用闲置安卓机当服务器

> **验证结论(先读)**:本项目是 Next.js 应用,`next build` 依赖 SWC 原生二进制。
> npm 上**不存在 `@next/swc-android-arm64`**,因此「原生 Termux 直接 npm run build」**必定失败**
> (vercel/next.js #58483、#63290、#67605 等多个 issue 证实)。
> 正确路径是在 Termux 里装 **proot-distro Ubuntu**(glibc Linux 环境):Node 会识别为
> `linux-arm64`,SWC / better-sqlite3 / esbuild 全部有官方预编译包,与本项目沙盒验证环境同类。
> 本文平台无关步骤(setup→build→start→登录)已在 Linux glibc + Node 22 环境实测通过;
> Termux 特有步骤按官方文档核对,文末列出「实机待确认点」。

## 0. 前提

- 一台闲置安卓机(建议 Android 10+、4GB 内存+、arm64,常年插电放家里)
- 从 **F-Droid** 安装(Play 商店版已停止更新,勿用):
  - [Termux](https://f-droid.org/packages/com.termux/)
  - [Termux:Boot](https://f-droid.org/packages/com.termux.boot/)(开机自启用)
- 该手机安装 Tailscale 并登录你的账号(与其他设备同网,见 [部署-安卓端.md](部署-安卓端.md) 第一节)

## 1. Termux 基础准备(Termux 内执行)

```bash
pkg update && pkg upgrade          # 首次更新源(提示时按回车选默认)
pkg install proot-distro           # 装发行版管理器
termux-setup-storage               # 授权访问 /sdcard(之后拷备份用),弹窗点允许
```

## 2. 安装并进入 Ubuntu(关键一步)

```bash
proot-distro install ubuntu        # 下载约 100MB
proot-distro login ubuntu          # 进入 Ubuntu;提示符变为 root@localhost
```

> 以后每次要操作服务器环境,都是先 `proot-distro login ubuntu`。

## 3. Ubuntu 内装 Node 与部署应用

```bash
apt update && apt install -y curl git nano ca-certificates
# 装 Node 22 LTS(NodeSource 源)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v                            # 应显示 v22.x

# 部署应用(与 MacBook 流程完全一致)
git clone https://github.com/allenblade21/allentest.git
cd allentest
npm run setup                      # 装依赖 + 建库 + 默认数据 + 生成 .env.local
nano .env.local                    # 填 ARK_API_KEY,或先 OCR_MOCK=1(Ctrl+O 保存,Ctrl+X 退出)
npm run build                      # 若此处报 swc-android 错误 → 你没在 proot 里,回到第 2 步
npm start -- -H 0.0.0.0 -p 3000    # 启动
```

验证:同一部手机的浏览器开 `http://localhost:3000` 应见登录页 → 注册账号;
其他设备通过该手机的 Tailscale 地址 `http://<手机Tailscale名>:3000` 访问。

## 4. 常驻与开机自启

**保活(每次手动启动时)**:回到 Termux 本体(不退出可开新会话),执行 `termux-wake-lock`
(阻止系统休眠杀进程);并在系统设置里把 **Termux 加入电池优化白名单/不受限制**。

**开机自启(Termux:Boot)**:安装 Termux:Boot 后**手动打开过一次**,然后创建脚本:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-ledger.sh <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
proot-distro login ubuntu -- bash -lc 'cd /root/allentest && npm start -- -H 0.0.0.0 -p 3000'
EOF
chmod +x ~/.termux/boot/start-ledger.sh
```

重启手机验证:约 1-2 分钟后其他设备应能访问。日常也可手动跑这条脚本启动。

## 5. 备份与升级

```bash
# 备份(Ubuntu 内):快照到 backups/,再拷出到手机相册可见的存储
proot-distro login ubuntu -- bash -lc 'cd /root/allentest && npm run backup'
cp -r $PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/allentest/backups /sdcard/ledger-backups

# 升级版本(Ubuntu 内)
cd /root/allentest && git pull && npm run setup && npm run build
# 然后重启手机或杀掉 node 进程重跑启动脚本
```

## 6. 排查表

| 现象 | 原因与处理 |
|------|-----------|
| build 报 `Failed to load SWC binary for android/arm64` | 在原生 Termux 而非 proot Ubuntu 里跑了——`proot-distro login ubuntu` 后再试 |
| `npm install` 编译 better-sqlite3 失败 | 同上;proot Ubuntu 内有 linux-arm64 预编译包,不应触发源码编译 |
| 手机锁屏后服务断 | 没执行 `termux-wake-lock` / Termux 未加省电白名单 |
| 重启后没自启 | Termux:Boot 装后要**手动打开过一次**;脚本需 `chmod +x`;查 `~/.termux/boot/` 文件名 |
| 访问慢 | proot 有 10-30% 性能开销 + 手机存储较慢,build 可能要几分钟,运行期影响不大 |

## 7. 实机待确认点(本文档在沙盒无法覆盖的部分)

- [ ] `proot-distro install ubuntu` 在你的机型/网络下载正常
- [ ] NodeSource 脚本在 proot 内执行成功(失败则改用 `apt install -y nodejs npm` + `npm i -g n && n 22`)
- [ ] Termux:Boot 重启自启生效(个别 ROM 会拦第三方开机项,需在系统设置放行)
- [ ] 长期运行的发热/耗电可接受

> 定位:**备选方案**。正式方案仍是 MacBook + launchd(ADR 0011,[部署.md](部署.md)),
> 稳定性、性能与备份便利性都更好;Termux 适合"手头只有闲置手机"的场景。
