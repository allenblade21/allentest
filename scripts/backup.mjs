// 数据备份:SQLite 在线备份(WAL 安全,不用停服务)+ OCR 原图,输出到 backups/<时间戳>/
// 用法:npm run backup;可用环境变量覆盖 DATABASE_PATH / BACKUP_DIR / BACKUP_KEEP(默认保留 30 份)
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = process.env.DATABASE_PATH ?? path.join(root, "data", "app.db");
const outRoot = process.env.BACKUP_DIR ?? path.join(root, "backups");
const keep = Math.max(1, Number(process.env.BACKUP_KEEP ?? 30));

if (!fs.existsSync(dbPath)) {
  console.error(`找不到数据库:${dbPath}(先跑 npm run setup)`);
  process.exit(1);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const outDir = path.join(outRoot, stamp);
fs.mkdirSync(outDir, { recursive: true });

// 1) 数据库:better-sqlite3 的在线备份 API,应用运行中执行也一致安全
const db = new Database(dbPath, { readonly: true });
await db.backup(path.join(outDir, "app.db"));
db.close();

// 2) OCR 原图目录(存在才拷)
const uploads = path.join(root, "data", "uploads");
if (fs.existsSync(uploads)) {
  fs.cpSync(uploads, path.join(outDir, "uploads"), { recursive: true });
}

// 3) 轮转:按名称(即时间)排序,只保留最近 keep 份
const snapshots = fs
  .readdirSync(outRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(d.name))
  .map((d) => d.name)
  .sort();
for (const name of snapshots.slice(0, Math.max(0, snapshots.length - keep))) {
  fs.rmSync(path.join(outRoot, name), { recursive: true, force: true });
}

const size = (fs.statSync(path.join(outDir, "app.db")).size / 1024).toFixed(1);
console.log(`备份完成:${outDir}(app.db ${size} KB,当前共 ${Math.min(snapshots.length, keep)} 份,保留最近 ${keep} 份)`);
