import { test, expect, type Page } from "@playwright/test";
import { resetData, countRows } from "./helpers";

// 记账核心流程 —— 对应 docs/测试用例.md TC-T 组

async function tapKeys(page: Page, keys: string[]) {
  for (const k of keys) {
    await page.getByRole("button", { name: k, exact: true }).click();
  }
}

test.describe("记账", () => {
  test.beforeEach(() => resetData());

  test("TC-T1 手动记一笔支出,首页显示且汇总正确", async ({ page }) => {
    await page.goto("/record");
    await tapKeys(page, ["3", "2", ".", "5"]);
    await page.getByRole("button", { name: "餐饮" }).click();
    await page.locator("select").selectOption({ label: "微信支付" });
    await page.getByPlaceholder("选填").fill("午饭");
    await page.getByRole("button", { name: "保存", exact: true }).click();

    await page.waitForURL("/");
    await expect(page.getByText("午饭")).toBeVisible();
    await expect(page.getByText("¥32.50").first()).toBeVisible();
    expect(countRows("transactions")).toBe(1);
  });

  test("TC-T2 记收入后结余 = 收入 - 支出", async ({ page }) => {
    // 先记支出 35
    await page.goto("/record");
    await tapKeys(page, ["3", "5"]);
    await page.getByRole("button", { name: "餐饮" }).click();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL("/");

    // 再记收入 12000
    await page.goto("/record");
    await page.getByRole("button", { name: "收入", exact: true }).click();
    await tapKeys(page, ["1", "2", "0", "0", "0"]);
    await page.getByRole("button", { name: "工资" }).click();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL("/");

    await expect(page.getByText("+¥11,965.00")).toBeVisible(); // 结余
    await expect(page.getByText("¥12,000.00").first()).toBeVisible(); // 收入
  });

  test("TC-T3 金额为空或未选分类时保存被拦截并提示", async ({ page }) => {
    await page.goto("/record");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("请输入金额")).toBeVisible();

    await tapKeys(page, ["8"]);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("请选择分类")).toBeVisible();
    expect(countRows("transactions")).toBe(0);
  });

  test("TC-T4 「再记一笔」连续录入不离开页面", async ({ page }) => {
    await page.goto("/record");
    await tapKeys(page, ["6"]);
    await page.getByRole("button", { name: "交通" }).click();
    await page.getByRole("button", { name: "再记一笔" }).click();
    await expect(page.getByText("已保存,继续记下一笔")).toBeVisible();
    await expect(page).toHaveURL(/\/record/); // 没有跳走
    expect(countRows("transactions")).toBe(1);
  });

  test("TC-T5 点击流水条目可编辑金额并生效", async ({ page }) => {
    await page.goto("/record");
    await tapKeys(page, ["3", "2", ".", "5"]);
    await page.getByRole("button", { name: "餐饮" }).click();
    await page.getByPlaceholder("选填").fill("午饭");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL("/");

    await page.getByText("午饭").click();
    await page.waitForURL(/record\?id=/);
    await expect(page.getByRole("heading", { name: "编辑账目" })).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "⌫" }).click();
    await tapKeys(page, ["3", "5"]);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL("/");
    await expect(page.getByText("¥35.00").first()).toBeVisible();
  });

  test("TC-T6 删除条目(带确认)后首页不再显示", async ({ page }) => {
    await page.goto("/record");
    await tapKeys(page, ["9", "9"]);
    await page.getByRole("button", { name: "购物" }).click();
    await page.getByPlaceholder("选填").fill("待删除项");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.waitForURL("/");

    page.on("dialog", (d) => d.accept());
    await page.getByText("待删除项").click();
    await page.waitForURL(/record\?id=/);
    await page.getByRole("button", { name: "删除" }).click();
    await page.waitForURL("/");
    await expect(page.getByText("待删除项")).not.toBeVisible();
    expect(countRows("transactions")).toBe(0);
  });

  test("TC-T7 月份切换:上个月无账目显示空状态", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "‹" }).click();
    await expect(page.getByText("本月还没有账目")).toBeVisible();
  });
});
