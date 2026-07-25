import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { resetData } from "./helpers";

// 分类/账户管理 —— 对应 docs/测试用例.md TC-CM 组
// 用例自建自删,不污染 seed 数据(餐饮=1 等 id 被其他组依赖)

function count(table: "categories" | "accounts", name: string): number {
  const db = new Database("data/test.db");
  const n = (db.prepare(`select count(*) c from ${table} where name = ?`).get(name) as { c: number }).c;
  db.close();
  return n;
}
function curDay(): string {
  return new Date().toISOString().slice(0, 10);
}
async function apiAdd(page: Page, api: string, data: Record<string, unknown>): Promise<number> {
  const r = await page.request.post(api, { data });
  expect(r.status()).toBe(201);
  const body = await r.json();
  return (body.category ?? body.account).id;
}

test.describe("分类与账户管理", () => {
  test.beforeEach(() => resetData());

  test("TC-CM1 分类管理:入口、新增(带图标/类型)并持久化,用完删除", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /分类管理/ }).click();
    await expect(page).toHaveURL(/\/categories/);

    await page.getByRole("button", { name: /新增分类/ }).click();
    await page.getByLabel("分类管理名称").fill("宠物");
    await page.getByLabel("图标").fill("🐱");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("宠物")).toBeVisible();
    expect(count("categories", "宠物")).toBe(1);

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "删除宠物" }).click();
    await expect(page.getByText("宠物")).not.toBeVisible();
    expect(count("categories", "宠物")).toBe(0);
  });

  test("TC-CM2 改名同步历史:流水显示新分类名", async ({ page }) => {
    const id = await apiAdd(page, "/api/categories", { name: "旧名分类", type: "expense", icon: "🧪" });
    const r = await page.request.post("/api/transactions", {
      data: { type: "expense", amountCents: 1000, categoryId: id, date: curDay(), note: "改名测试" },
    });
    expect(r.ok()).toBeTruthy();

    await page.goto("/categories");
    await page.getByRole("button", { name: "改名旧名分类" }).click();
    await page.getByLabel("新名称").fill("新名分类");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("新名分类")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("新名分类")).toBeVisible(); // 历史流水同步显示新名

    // 清理:先删流水再删分类
    resetData();
    const del = await page.request.delete(`/api/categories/${id}`);
    expect(del.ok()).toBeTruthy();
  });

  test("TC-CM3 使用中保护:被流水引用的分类删除返回 409 并提示", async ({ page }) => {
    const id = await apiAdd(page, "/api/categories", { name: "使用中分类", type: "expense" });
    await page.request.post("/api/transactions", {
      data: { type: "expense", amountCents: 1000, categoryId: id, date: curDay() },
    });
    const res = await page.request.delete(`/api/categories/${id}`);
    expect(res.status()).toBe(409);

    await page.goto("/categories");
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "删除使用中分类" }).click();
    await expect(page.getByText(/使用中.*不能删除/)).toBeVisible();
    expect(count("categories", "使用中分类")).toBe(1); // 未被删

    resetData();
    await page.request.delete(`/api/categories/${id}`);
  });

  test("TC-CM4 账户管理:新增/改名/删除全链路", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByRole("button", { name: /新增账户/ }).click();
    await page.getByLabel("账户管理名称").fill("招行卡");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("招行卡")).toBeVisible();

    await page.getByRole("button", { name: "改名招行卡" }).click();
    await page.getByLabel("新名称").fill("招行储蓄卡");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("招行储蓄卡")).toBeVisible();
    expect(count("accounts", "招行储蓄卡")).toBe(1);

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "删除招行储蓄卡" }).click();
    await expect(page.getByText("招行储蓄卡")).not.toBeVisible();
    expect(count("accounts", "招行储蓄卡")).toBe(0);
  });
});
