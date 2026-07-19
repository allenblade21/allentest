import { test, expect, type Page } from "@playwright/test";
import { resetData } from "./helpers";

// 月度报告 —— 对应 docs/测试用例.md TC-RP 组
// 分类 id 来自 seed:餐饮=1 交通=2 工资=9

function monthShift(delta: number): string {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}
async function addTx(page: Page, data: Record<string, unknown>) {
  const r = await page.request.post("/api/transactions", { data });
  expect(r.ok()).toBeTruthy();
}

test.describe("月度报告", () => {
  test.beforeEach(() => resetData());

  test("TC-RP1 「我的」进入月度报告,空月各区显示空态", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /月度报告/ }).click();
    await expect(page).toHaveURL(/\/report/);
    await expect(page.getByText("本月暂无支出")).toBeVisible();
    await expect(page.getByText("未设置预算", { exact: false })).toBeVisible();
  });

  test("TC-RP2 汇总/环比/分类Top/最大单笔/预算执行齐全", async ({ page }) => {
    const m0 = monthShift(0), m1 = monthShift(-1);
    await addTx(page, { type: "expense", amountCents: 10000, categoryId: 1, date: `${m1}-05`, note: "上月餐" });
    await addTx(page, { type: "expense", amountCents: 12000, categoryId: 1, date: `${m0}-06`, note: "聚餐" });
    await addTx(page, { type: "expense", amountCents: 3000, categoryId: 2, date: `${m0}-07`, note: "打车" });
    await addTx(page, { type: "income", amountCents: 500000, categoryId: 9, date: `${m0}-10`, note: "工资" });
    await page.request.put("/api/budgets", { data: { items: [{ categoryId: 1, limitCents: 10000 }] } });

    await page.goto("/report");
    await expect(page.getByText("+¥4,850.00")).toBeVisible(); // 5000 - 150
    await expect(page.getByText(/支出环比上月/)).toBeVisible();
    await expect(page.getByText("+50.0%")).toBeVisible(); // 150 vs 100
    await expect(page.getByText(/餐饮/).first()).toBeVisible();
    await expect(page.getByText("80%")).toBeVisible(); // 120/150
    await expect(page.getByText("聚餐", { exact: false }).first()).toBeVisible(); // 最大单笔
    await expect(page.getByText(/1 类超支/)).toBeVisible(); // 餐饮 120 > 100
  });

  test("TC-RP3 月份切换:上月报告显示上月数据", async ({ page }) => {
    const m1 = monthShift(-1);
    await addTx(page, { type: "expense", amountCents: 10000, categoryId: 1, date: `${m1}-05`, note: "上月餐" });
    await page.goto("/report");
    await page.getByRole("link", { name: "‹" }).nth(1).click(); // 第二个 ‹ 是月份切换(第一个是返回)
    await expect(page).toHaveURL(new RegExp(`month=${m1}`));
    await expect(page.getByText("¥100.00").first()).toBeVisible();
    await expect(page.getByText("上月餐", { exact: false })).toBeVisible();
  });
});
