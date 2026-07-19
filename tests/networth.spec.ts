import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { resetData } from "./helpers";

function resetFunds() {
  const db = new Database("data/test.db");
  db.exec("delete from fund_records; delete from funds;");
  db.close();
}

// 净资产总览 —— 对应 docs/测试用例.md TC-NW 组

function curMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
async function addTx(page: Page, type: string, amountCents: number) {
  const r = await page.request.post("/api/transactions", {
    data: { type, amountCents, categoryId: type === "expense" ? 1 : 9, date: `${curMonth()}-05` },
  });
  expect(r.ok()).toBeTruthy();
}

test.describe("净资产", () => {
  test.beforeEach(() => { resetData(); resetFunds(); });

  test("TC-NW1 「我的」进入净资产总览,空数据为 ¥0.00", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /净资产总览/ }).click();
    await expect(page).toHaveURL(/\/networth/);
    await expect(page.getByText("净资产", { exact: true })).toBeVisible();
    await expect(page.getByText("¥0.00").first()).toBeVisible();
  });

  test("TC-NW2 现金结余 = 收入 − 支出;总额含基金最新市值", async ({ page }) => {
    await addTx(page, "income", 1000000); // +10000
    await addTx(page, "expense", 300000); // -3000 → 现金 7000
    // 记一只基金:两期快照,最新 8000
    for (const [date, cents] of [["2026-06-15", 750000], [`${curMonth()}-10`, 800000]] as const) {
      const r = await page.request.post("/api/funds", {
        data: { code: "110022", name: "易方达消费行业", marketValueCents: cents, date },
      });
      expect(r.ok()).toBeTruthy();
    }
    await page.goto("/networth");
    await expect(page.getByText("¥15,000.00")).toBeVisible(); // 7000 + 8000
    await expect(page.getByText("¥7,000.00")).toBeVisible();
    await expect(page.getByText("¥8,000.00")).toBeVisible();
  });
});
