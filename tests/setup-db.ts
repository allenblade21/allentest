import { execSync } from "node:child_process";
import fs from "node:fs";

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
console.log(`测试库就绪: ${dbPath}`);
