import fs from "node:fs";
import { defineConfig } from "@playwright/test";

// 优先用 PW_CHROMIUM_PATH 指定的浏览器;云端环境有预装 Chromium 则直接复用;
// 本机都没有时走 Playwright 默认查找(需 npx playwright install)
const chromiumPath =
  process.env.PW_CHROMIUM_PATH ??
  (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

// 端到端测试:独立测试库(data/test.db)+ OCR mock,不触碰开发数据
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1, // 共享一个 SQLite 测试库,串行执行避免相互污染
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3210",
    viewport: { width: 390, height: 844 }, // 手机优先,按 iPhone 尺寸测试
    screenshot: "on", // 每个用例留存页面截图,报告里可查看
    trace: "retain-on-failure",
    launchOptions: { executablePath: chromiumPath },
  },
  webServer: {
    command: "tsx tests/setup-db.ts && npm run start -- -p 3210",
    url: "http://localhost:3210",
    env: { DATABASE_PATH: "./data/test.db", OCR_MOCK: "1" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
