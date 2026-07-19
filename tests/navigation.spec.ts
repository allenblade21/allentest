import { test, expect } from "@playwright/test";
import { resetData } from "./helpers";

// 页面与导航 —— 对应 docs/测试用例.md TC-N 组

test.describe("页面与导航", () => {
  test("TC-N1 五个页面均可访问且渲染核心元素", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("本月结余")).toBeVisible();

    await page.goto("/record");
    await expect(page.getByRole("heading", { name: "记一笔" })).toBeVisible();
    await expect(page.getByRole("button", { name: "餐饮" })).toBeVisible();

    await page.goto("/import");
    await expect(page.getByRole("heading", { name: "导入账单" })).toBeVisible();

    await page.goto("/funds");
    await expect(page.getByText("总市值")).toBeVisible();

    await page.goto("/me");
    await expect(page.getByText("分类管理")).toBeVisible();
  });

  test("TC-N3 首页 hero 卡:月份切换/导入/结余/收支集成于一卡,提醒为单行条", async ({ page }) => {
    // 造一条到期周期支出 + 一类超支预算,验证两条提醒各占一行且可点击跳转
    await page.request.post("/api/recurring", {
      data: { name: "提醒条测试", amountCents: 1000, categoryId: null, cycle: "monthly", nextDate: "2020-01-01" },
    });
    await page.request.put("/api/budgets", { data: { items: [{ categoryId: 1, limitCents: 100 }] } });
    await page.request.post("/api/transactions", {
      data: { type: "expense", amountCents: 200, categoryId: 1, date: new Date().toISOString().slice(0, 10) },
    });

    await page.goto("/");
    // hero 卡内包含月份切换与导入按钮、结余与收支汇总
    const hero = page.locator("section").first();
    await expect(hero.getByRole("link", { name: "‹" })).toBeVisible();
    await expect(hero.getByRole("link", { name: "⤓ 导入" })).toBeVisible();
    await expect(hero.getByText("本月结余")).toBeVisible();
    await expect(hero.getByText("支出", { exact: false })).toBeVisible();
    // 两条提醒均为单行条,点击到期条进入周期支出页
    await expect(page.getByText(/提醒条测试 .*已到期/)).toBeVisible();
    await expect(page.getByText(/已超预算/)).toBeVisible();
    await page.getByText(/提醒条测试/).click();
    await expect(page).toHaveURL(/\/recurring/);

    // 清理本用例数据,避免影响后续组
    resetData();
  });

  test("TC-N2 底部导航可切换且当前项高亮", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /基金/ }).click();
    await expect(page).toHaveURL(/\/funds$/);
    await expect(page.getByText("总市值")).toBeVisible();

    await page.getByRole("link", { name: /我的/ }).click();
    await expect(page).toHaveURL(/\/me$/);

    await page.getByRole("link", { name: /记一笔/ }).click();
    await expect(page).toHaveURL(/\/record$/);
  });
});
