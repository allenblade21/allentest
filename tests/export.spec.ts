import { test, expect, type Page } from "@playwright/test";
import { resetData } from "./helpers";

// 导出 CSV —— 对应 docs/测试用例.md TC-EX 组

function curMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

test.describe("导出 CSV", () => {
  test.beforeEach(() => resetData());

  test("TC-EX1 流水 CSV:表头齐全、金额转元、备注与分类正确", async ({ page }) => {
    const r = await page.request.post("/api/transactions", {
      data: { type: "expense", amountCents: 12345, categoryId: 1, date: `${curMonth()}-05`, note: "团建,聚餐" },
    });
    expect(r.ok()).toBeTruthy();
    const res = await page.request.get("/api/export?type=transactions");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toContain("transactions.csv");
    const body = await res.text();
    expect(body).toContain("日期,类型,金额(元),分类,账户,备注,来源");
    expect(body).toContain("123.45");
    expect(body).toContain("餐饮");
    expect(body).toContain('"团建,聚餐"'); // 含逗号字段被引号包裹
  });

  test("TC-EX2 基金 CSV:含代码/名称/市值(元)", async ({ page }) => {
    const r = await page.request.post("/api/funds", {
      data: { code: "110022", name: "易方达消费行业", marketValueCents: 800000, date: `${curMonth()}-10` },
    });
    expect(r.ok()).toBeTruthy();
    const res = await page.request.get("/api/export?type=funds");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("基金代码,基金名称,日期");
    expect(body).toContain("110022");
    expect(body).toContain("易方达消费行业");
    expect(body).toContain("8000.00");
  });

  test("TC-EX3 保护与校验:未登录 401,非法 type 400", async ({ page, browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anon = await ctx.request.get("http://localhost:3210/api/export?type=transactions");
    expect(anon.status()).toBe(401);
    await ctx.close();
    const bad = await page.request.get("/api/export?type=hack");
    expect(bad.status()).toBe(400);
  });
});
