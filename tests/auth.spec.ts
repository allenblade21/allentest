import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { TEST_USER } from "./test-session";

// 登录 / 注册 / 访问保护 —— 对应 docs/测试用例.md TC-AU 组
// 本组用例不带默认登录态(清空 storageState),从零验证认证链路

test.use({ storageState: { cookies: [], origins: [] } });

function userCount(): number {
  const db = new Database("data/test.db");
  const n = (db.prepare("select count(*) c from users").get() as { c: number }).c;
  db.close();
  return n;
}

test.describe("认证与访问保护", () => {
  test("TC-AU1 未登录:页面重定向到 /login,API 返回 401", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/budget");
    await expect(page).toHaveURL(/\/login/);

    const res = await page.request.get("/api/recurring");
    expect(res.status()).toBe(401);
    const post = await page.request.post("/api/transactions", {
      data: { type: "expense", amountCents: 100, categoryId: 1, date: "2026-07-01" },
    });
    expect(post.status()).toBe(401);
  });

  test("TC-AU2 注册新账号:自动登录进首页,「我的」显示用户名", async ({ page }) => {
    const before = userCount();
    await page.goto("/register");
    await page.getByLabel("用户名").fill("小明");
    await page.getByLabel("密码").fill("secret-123");
    await page.getByRole("button", { name: "注册", exact: true }).click();

    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByText("本月结余")).toBeVisible();
    expect(userCount()).toBe(before + 1);

    await page.goto("/me");
    await expect(page.getByText("👤 小明")).toBeVisible();
  });

  test("TC-AU3 重复用户名与错误密码均被拦截并提示", async ({ page }) => {
    // e2e 用户已由 setup-db 建好 → 重名注册 409
    await page.goto("/register");
    await page.getByLabel("用户名").fill(TEST_USER.username);
    await page.getByLabel("密码").fill("whatever-123");
    await page.getByRole("button", { name: "注册", exact: true }).click();
    await expect(page.getByText("用户名已存在")).toBeVisible();

    // 错误密码登录 → 统一文案
    await page.goto("/login");
    await page.getByLabel("用户名").fill(TEST_USER.username);
    await page.getByLabel("密码").fill("wrong-password");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("用户名或密码错误")).toBeVisible();
  });

  test("TC-AU4 正确密码登录成功进入首页", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill(TEST_USER.username);
    await page.getByLabel("密码").fill(TEST_USER.password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByText("本月结余")).toBeVisible();
  });

  test("TC-AU5 退出登录:回到 /login 且会话吊销,再访问被拦", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill(TEST_USER.username);
    await page.getByLabel("密码").fill(TEST_USER.password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("本月结余")).toBeVisible();

    await page.goto("/me");
    await page.getByRole("button", { name: "退出登录" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("TC-AU6 已登录访问 /login 自动跳回首页", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill(TEST_USER.username);
    await page.getByLabel("密码").fill(TEST_USER.password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("本月结余")).toBeVisible();

    await page.goto("/login");
    await expect(page).toHaveURL(/\/$|\/\?/);
  });
});
