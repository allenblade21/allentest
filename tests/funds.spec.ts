import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { FAKE_PNG } from "./helpers";

// 基金模块 —— 对应 docs/测试用例.md TC-F 组
// 服务端 OCR_MOCK=1:基金识别固定返回 4 只(3 有代码 + 1 无代码存疑)

function resetFunds() {
  const db = new Database("data/test.db");
  db.exec("delete from fund_records; delete from funds;");
  db.close();
}
function countFundRecords(): number {
  const db = new Database("data/test.db");
  const n = (db.prepare("select count(*) c from fund_records").get() as { c: number }).c;
  db.close();
  return n;
}

async function importFunds(page: Page) {
  await page.goto("/funds/import");
  await page.locator('input[type="file"]').setInputFiles({ name: "holding.png", mimeType: "image/png", buffer: FAKE_PNG });
  await page.getByRole("button", { name: /开始识别/ }).click();
  await expect(page.getByText(/待确认 \d+ 只/)).toBeVisible({ timeout: 30000 });
}

test.describe("基金", () => {
  test.beforeEach(() => resetFunds());

  test("TC-F1 基金页空状态,提示导入/手动", async ({ page }) => {
    await page.goto("/funds");
    await expect(page.getByText("总市值")).toBeVisible();
    await expect(page.getByText("还没有基金记录")).toBeVisible();
  });

  test("TC-F2 持仓截图 OCR 识别,无代码/存疑默认不勾选", async ({ page }) => {
    await importFunds(page);
    await expect(page.getByText("待确认 4 只")).toBeVisible();
    await expect(page.getByText("存疑", { exact: true })).toBeVisible();
    // 3 只有代码且 high,默认勾选;第 4 只无代码存疑不勾
    await expect(page.getByRole("button", { name: "已选 3 / 4" })).toBeVisible();
    expect(countFundRecords()).toBe(0); // 未入账
  });

  test("TC-F3 入账后总览汇总与列表正确", async ({ page }) => {
    await importFunds(page);
    await page.getByRole("button", { name: "入账", exact: true }).click();
    await page.waitForURL("/funds");
    // 3 只入账;总市值 = 20150+15400+10230 = 45780
    await expect(page.getByText("¥45,780.00")).toBeVisible();
    await expect(page.getByText("华夏沪深300ETF联接A")).toBeVisible();
    await expect(page.getByText("持有基金 · 3 只")).toBeVisible();
    expect(countFundRecords()).toBe(3);
  });

  test("TC-F4 手动记快照并进入详情页看到走势表", async ({ page }) => {
    await page.goto("/funds/new");
    await page.getByPlaceholder("6 位数字").fill("110022");
    await page.getByPlaceholder(/华夏沪深/).fill("易方达消费行业");
    await page.getByPlaceholder("必填").fill("8000");
    await page.getByPlaceholder("如 0.42 或 -2.1").fill("1.5");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/110022/);
    await expect(page.getByText("易方达消费行业")).toBeVisible();
    await expect(page.getByText("历史快照 · 1 条")).toBeVisible();
    await expect(page.getByText("¥8,000.00").first()).toBeVisible();
    expect(countFundRecords()).toBe(1);
  });

  test("TC-F5 同基金跨期:补录第二期算出较上期涨跌与持有期汇总", async ({ page }) => {
    // 第一期
    await page.goto("/funds/new");
    await page.getByPlaceholder("6 位数字").fill("000051");
    await page.getByPlaceholder(/华夏沪深/).fill("华夏沪深300");
    await page.getByPlaceholder("必填").fill("10000");
    await page.locator('input[type="date"]').fill("2026-07-01");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/000051/);

    // 补录第二期(市值涨到 11000 → 较上期 +10%)
    await page.getByRole("link", { name: /补录/ }).click();
    await page.waitForURL(/\/funds\/new/);
    await page.getByPlaceholder("必填").fill("11000");
    await page.locator('input[type="date"]').fill("2026-07-08");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/000051/);

    await expect(page.getByText("历史快照 · 2 条")).toBeVisible();
    await expect(page.getByText("+10.00%").first()).toBeVisible(); // 较上期 / 持有期涨跌
    expect(countFundRecords()).toBe(2);
  });

  test("TC-F6 同基金同日再记覆盖(不新增快照)", async ({ page }) => {
    await page.goto("/funds/new");
    await page.getByPlaceholder("6 位数字").fill("000198");
    await page.getByPlaceholder(/华夏沪深/).fill("天弘余额宝");
    await page.getByPlaceholder("必填").fill("5000");
    await page.locator('input[type="date"]').fill("2026-07-10");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/000198/);

    // 同日再记,市值改为 5500 → 覆盖
    await page.getByRole("link", { name: /补录/ }).click();
    await page.getByPlaceholder("必填").fill("5500");
    await page.locator('input[type="date"]').fill("2026-07-10");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/000198/);

    await expect(page.getByText("历史快照 · 1 条")).toBeVisible(); // 仍 1 条
    await expect(page.getByText("¥5,500.00").first()).toBeVisible(); // 已覆盖
    expect(countFundRecords()).toBe(1);
  });

  test("TC-F7 删除快照", async ({ page }) => {
    await page.goto("/funds/new");
    await page.getByPlaceholder("6 位数字").fill("161725");
    await page.getByPlaceholder(/华夏沪深/).fill("招商白酒");
    await page.getByPlaceholder("必填").fill("3000");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL(/\/funds\/161725/);

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "✕" }).click();
    await page.waitForTimeout(500);
    expect(countFundRecords()).toBe(0);
  });
});
