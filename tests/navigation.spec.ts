import { test, expect } from "@playwright/test";

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
