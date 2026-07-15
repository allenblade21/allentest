import { test, expect, type Page } from "@playwright/test";
import { resetData } from "./helpers";

// 消费分析 —— 对应 docs/测试用例.md TC-A 组

function ym(): { cur: string; last: string } {
  const d = new Date();
  const cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last = `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
  return { cur, last };
}

async function addTx(page: Page, data: Record<string, unknown>) {
  const r = await page.request.post("/api/transactions", { data });
  expect(r.ok()).toBeTruthy();
}

test.describe("消费分析", () => {
  test.beforeEach(() => resetData());

  test("TC-A1 从「我的」进入消费分析", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /消费分析/ }).click();
    await expect(page).toHaveURL(/\/analysis/);
    await expect(page.getByRole("heading", { name: "消费分析" })).toBeVisible();
  });

  test("TC-A2 空数据显示零与空结构提示", async ({ page }) => {
    await page.goto("/analysis");
    await expect(page.getByText("本月支出", { exact: true })).toBeVisible();
    await expect(page.getByText("¥0.00").first()).toBeVisible();
    await expect(page.getByText("本月还没有支出记录")).toBeVisible();
  });

  test("TC-A3 分类结构按金额降序,占比正确", async ({ page }) => {
    const { cur } = ym();
    await addTx(page, { type: "expense", amountCents: 30000, categoryId: 1, date: `${cur}-05`, note: "餐饮大" });
    await addTx(page, { type: "expense", amountCents: 10000, categoryId: 2, date: `${cur}-06`, note: "交通小" });
    await page.goto("/analysis");
    // 本月支出 400 元
    await expect(page.getByText("¥400.00").first()).toBeVisible();
    // 餐饮 300(75%)、交通 100(25%)
    await expect(page.getByText("餐饮")).toBeVisible();
    await expect(page.getByText("75%")).toBeVisible();
    await expect(page.getByText("25%")).toBeVisible();
    // 降序:餐饮金额条在交通之前
    const rows = page.locator("section:has-text('分类结构') >> text=/餐饮|交通/");
    await expect(rows.first()).toHaveText(/餐饮/);
  });

  test("TC-A4 环比:本月 vs 上月支出", async ({ page }) => {
    const { cur, last } = ym();
    await addTx(page, { type: "expense", amountCents: 10000, categoryId: 1, date: `${last}-10` }); // 上月 100
    await addTx(page, { type: "expense", amountCents: 15000, categoryId: 1, date: `${cur}-10` }); // 本月 150
    await page.goto("/analysis");
    await expect(page.getByText("¥150.00").first()).toBeVisible();
    await expect(page.getByText(/50\.0% 环比/)).toBeVisible(); // (150-100)/100 = +50%
    await expect(page.getByText("上月 ¥100.00")).toBeVisible();
  });
});
