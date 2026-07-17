import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import Database from "better-sqlite3";
import { TEST_SESSION_TOKEN, TEST_USER } from "./test-session";

// 重建干净的测试数据库(迁移 + 默认分类账户)。
// 在 playwright.config 的 webServer.command 中、服务器启动前执行
// (不能放 globalSetup:Playwright 先起 webServer 后跑 globalSetup)。
const dbPath = process.env.DATABASE_PATH ?? "./data/test.db";
for (const suffix of ["", "-wal", "-shm"]) {
  fs.rmSync(dbPath + suffix, { force: true });
}
const env = { ...process.env, DATABASE_PATH: dbPath };
execSync("npm run db:migrate", { env, stdio: "inherit" });
execSync("npm run db:seed", { env, stdio: "inherit" });

// 写入固定测试用户 + 长效会话,playwright.config 用 storageState 注入对应 cookie
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(TEST_USER.password, salt, 64).toString("hex");
const tokenHash = crypto.createHash("sha256").update(TEST_SESSION_TOKEN).digest("hex");
const expires = new Date(Date.now() + 365 * 86400000).toISOString();
const db = new Database(dbPath);
const { lastInsertRowid } = db
  .prepare("insert into users (username, password_hash) values (?, ?)")
  .run(TEST_USER.username, `${salt}:${hash}`);
db.prepare("insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)").run(
  tokenHash,
  Number(lastInsertRowid),
  expires,
);
db.close();
console.log(`测试库就绪: ${dbPath}(含 e2e 用户与固定会话)`);
