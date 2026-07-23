import { test, expect } from "@playwright/test";
import { resetData } from "./helpers";

// AI 财务问答 —— 对应 docs/测试用例.md TC-AI 组
// OCR_MOCK=1 下返回确定性演示回答(含本月支出/收入/Top 分类),用于断言事实注入正确

function curMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

test.describe("AI 财务问答", () => {
  test.beforeEach(() => resetData());

  test("TC-AI1 入口与提问:回答包含账本真实数字", async ({ page }) => {
    // 造事实:本月支出 123 + 收入 5000,支出最高分类=餐饮
    for (const t of [
      { type: "expense", amountCents: 12300, categoryId: 1, date: `${curMonth()}-05`, note: "聚餐" },
      { type: "income", amountCents: 500000, categoryId: 9, date: `${curMonth()}-10` },
    ]) {
      const r = await page.request.post("/api/transactions", { data: t });
      expect(r.ok()).toBeTruthy();
    }
    await page.goto("/me");
    await page.getByRole("link", { name: /AI 问答/ }).click();
    await expect(page).toHaveURL(/\/ask/);

    await page.getByLabel("问题").fill("这个月花了多少钱?");
    await page.getByRole("button", { name: "提问" }).click();
    await expect(page.getByText(/¥123\.00/)).toBeVisible();
    await expect(page.getByText(/¥5,000\.00/)).toBeVisible();
    await expect(page.getByText(/餐饮/)).toBeVisible();
  });

  test("TC-AI2 快捷问题一键提问;空问题被拦截", async ({ page }) => {
    await page.goto("/ask");
    await page.getByRole("button", { name: "提问" }).click();
    await expect(page.getByText("请输入问题")).toBeVisible();

    await page.getByRole("button", { name: "支出最多的分类是什么?" }).click();
    await expect(page.getByText(/演示模式/)).toBeVisible();
  });

  test("TC-AI3 未登录调用 API 返回 401;超长问题 400", async ({ page, browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anon = await ctx.request.post("http://localhost:3210/api/ai/ask", { data: { question: "hi" } });
    expect(anon.status()).toBe(401);
    await ctx.close();

    const long = await page.request.post("/api/ai/ask", { data: { question: "问".repeat(201) } });
    expect(long.status()).toBe(400);
  });
});
