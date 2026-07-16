import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { resetData } from "./helpers";

// 预算体系 —— 对应 docs/测试用例.md TC-BG 组
// 分类 id 来自 seed 固定顺序:餐饮=1 交通=2 …

function curMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function budgetRows(): Array<{ category_id: number; limit_cents: number }> {
  const db = new Database("data/test.db");
  const rows = db.prepare("select category_id, limit_cents from budgets").all() as Array<{ category_id: number; limit_cents: number }>;
  db.close();
  return rows;
}
async function setBudget(page: Page, categoryId: number, limitCents: number) {
  const r = await page.request.put("/api/budgets", { data: { items: [{ categoryId, limitCents }] } });
  expect(r.ok()).toBeTruthy();
}
async function addExpense(page: Page, categoryId: number, amountCents: number) {
  const r = await page.request.post("/api/transactions", {
    data: { type: "expense", amountCents, categoryId, date: `${curMonth()}-05`, note: "预算测试" },
  });
  expect(r.ok()).toBeTruthy();
}

test.describe("预算", () => {
  test.beforeEach(() => resetData());

  test("TC-BG1 「我的」进入预算设置,填写保存并持久化", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /预算设置/ }).click();
    await expect(page).toHaveURL(/\/budget/);

    await page.getByLabel("餐饮预算").fill("500");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("已保存")).toBeVisible();

    const rows = budgetRows();
    expect(rows).toEqual([{ category_id: 1, limit_cents: 50000 }]);

    // 重新打开仍显示 500
    await page.goto("/budget");
    await expect(page.getByLabel("餐饮预算")).toHaveValue("500");
  });

  test("TC-BG2 分析页显示预算执行进度(未超支)", async ({ page }) => {
    await setBudget(page, 1, 50000); // 餐饮 500
    await addExpense(page, 1, 30000); // 花了 300
    await page.goto("/analysis");
    await expect(page.getByText("分类预算")).toBeVisible();
    await expect(page.getByText("¥300.00 / ¥500.00")).toBeVisible();
    await expect(page.getByText("超支", { exact: true })).not.toBeVisible();
  });

  test("TC-BG3 超支:分析页标红「超支」,首页出现提醒卡", async ({ page }) => {
    await setBudget(page, 1, 10000); // 餐饮 100
    await addExpense(page, 1, 15000); // 花了 150
    await page.goto("/analysis");
    await expect(page.getByText("超支", { exact: true })).toBeVisible();
    await expect(page.getByText("¥150.00 / ¥100.00")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(/餐饮 已超预算/)).toBeVisible();
    await expect(page.getByText("¥50.00").first()).toBeVisible(); // 超出额 150-100
  });

  test("TC-BG4 未设预算:分析页提示设置,首页无提醒", async ({ page }) => {
    await addExpense(page, 1, 99000);
    await page.goto("/analysis");
    await expect(page.getByText("去设置预算")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(/已超预算/)).not.toBeVisible();
  });

  test("TC-BG5 清空输入保存即删除该分类预算", async ({ page }) => {
    await setBudget(page, 1, 50000);
    await page.goto("/budget");
    await page.getByLabel("餐饮预算").fill("");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("已保存")).toBeVisible();
    expect(budgetRows()).toEqual([]);
  });
});
