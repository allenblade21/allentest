import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { resetData, countRows } from "./helpers";

// 批量修改 —— 对应 docs/测试用例.md TC-B 组
// 分类/账户 id 来自 seed 固定顺序:餐饮=1 交通=2 …;现金=1 微信支付=2

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

async function seedTransactions(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const res = await page.request.post("/api/transactions", {
      data: {
        type: "expense",
        amountCents: 1000 + i,
        categoryId: 1, // 餐饮
        accountId: 1, // 现金
        date: todayStr(),
        note: `批量测试${i + 1}`,
      },
    });
    expect(res.ok()).toBeTruthy();
  }
}

function countByCategory(categoryId: number): number {
  const db = new Database("data/test.db");
  const n = (
    db.prepare("select count(*) c from transactions where category_id = ?").get(categoryId) as { c: number }
  ).c;
  db.close();
  return n;
}

test.describe("批量修改", () => {
  test.beforeEach(async ({ page }) => {
    resetData();
    await seedTransactions(page, 3);
    await page.goto("/");
  });

  test("TC-B1 编辑进入多选模式,全选显示已选条数", async ({ page }) => {
    await page.getByRole("button", { name: "编辑" }).click();
    await expect(page.getByText("已选 0 条")).toBeVisible();
    await page.getByRole("button", { name: "全选", exact: true }).click();
    await expect(page.getByText("已选 3 条")).toBeVisible();
    // 完成退出多选模式
    await page.getByRole("button", { name: "完成" }).click();
    await expect(page.getByText("已选", { exact: false })).not.toBeVisible();
  });

  test("TC-B2 批量改分类生效并提示影响条数", async ({ page }) => {
    await page.getByRole("button", { name: "编辑" }).click();
    await page.getByRole("button", { name: "全选", exact: true }).click();
    await page.getByRole("button", { name: "改分类" }).click();
    await page.locator("select").selectOption({ label: "🚇 交通" });
    await page.getByRole("button", { name: "应用" }).click();

    await expect(page.getByText("已改分类 3 条")).toBeVisible();
    await expect(page.getByText("交通").first()).toBeVisible();
    expect(countByCategory(2)).toBe(3); // 全部改为交通
    expect(countByCategory(1)).toBe(0);
  });

  test("TC-B3 批量删除(带确认)后可一次撤销恢复", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "编辑" }).click();
    await page.getByRole("button", { name: "全选", exact: true }).click();
    await page.getByRole("button", { name: "删除" }).click();

    await expect(page.getByText("已删除 3 条")).toBeVisible();
    await expect(page.getByText("本月还没有账目")).toBeVisible();
    expect(countRows("transactions")).toBe(0);

    // 一次撤销:全部恢复
    await page.getByRole("button", { name: "撤销" }).click();
    await expect(page.getByText("批量测试1")).toBeVisible();
    expect(countRows("transactions")).toBe(3);
  });

  test("TC-B4 批量改日期后条目移入新日期分组", async ({ page }) => {
    await page.getByRole("button", { name: "编辑" }).click();
    await page.getByRole("button", { name: "全选", exact: true }).click();
    await page.getByRole("button", { name: "改日期" }).click();

    // 改到本月 1 号(若今天就是 1 号则改到 2 号,保证日期变化)
    const t = todayStr();
    const target = t.endsWith("-01") ? `${t.slice(0, 8)}02` : `${t.slice(0, 8)}01`;
    await page.locator('input[type="date"]').fill(target);
    await page.getByRole("button", { name: "应用" }).click();

    await expect(page.getByText("已改日期 3 条")).toBeVisible();
    const db = new Database("data/test.db");
    const n = (db.prepare("select count(*) c from transactions where date = ?").get(target) as { c: number }).c;
    db.close();
    expect(n).toBe(3);
  });

  test("TC-B5 未勾选时批量操作按钮不可用", async ({ page }) => {
    await page.getByRole("button", { name: "编辑" }).click();
    await expect(page.getByRole("button", { name: "改分类" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "删除" })).toBeDisabled();
  });
});
