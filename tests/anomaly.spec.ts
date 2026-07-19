import { test, expect, type Page } from "@playwright/test";
import { resetData } from "./helpers";

// 异常支出检测 —— 对应 docs/测试用例.md TC-AX 组(ADR 0014)
// 分类 id:餐饮=1 购物=3

function monthShift(delta: number): string {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}
async function addTx(page: Page, amountCents: number, catId: number, month: string, note = "") {
  const r = await page.request.post("/api/transactions", {
    data: { type: "expense", amountCents, categoryId: catId, date: `${month}-08`, note },
  });
  expect(r.ok()).toBeTruthy();
}
// 基线:近 3 个月每月 2 笔餐饮 ¥30(单笔均值 3000 分,月均 6000 分)
async function seedBaseline(page: Page) {
  for (const d of [-1, -2, -3]) {
    await addTx(page, 3000, 1, monthShift(d), "工作餐");
    await addTx(page, 3000, 1, monthShift(d), "工作餐");
  }
}

test.describe("异常支出检测", () => {
  test.beforeEach(() => resetData());

  test("TC-AX1 单笔异常:超基线单笔均值 3 倍触发首页提醒条与分析页区块", async ({ page }) => {
    await seedBaseline(page);
    await addTx(page, 52000, 1, monthShift(0), "高档日料"); // 520 > 3×30 且 ≥ ¥50
    await page.goto("/");
    // 大额单笔同时推高分类月总额 → 单笔 + 分类 共 2 项
    await expect(page.getByText(/检测到 .*2.* 项异常支出/)).toBeVisible();
    await page.getByText(/项异常支出/).click();
    await expect(page).toHaveURL(/\/analysis/);
    await expect(page.getByText(/单笔「高档日料」/)).toBeVisible();
    await expect(page.getByText(/「餐饮」本月合计/)).toBeVisible();
    await expect(page.getByText("¥520.00").first()).toBeVisible();
  });

  test("TC-AX2 正常波动:未超阈值不报", async ({ page }) => {
    await seedBaseline(page);
    await addTx(page, 8000, 1, monthShift(0), "普通聚餐"); // 80 < 3×30=90 → 不报
    await page.goto("/");
    await expect(page.getByText(/项异常支出/)).not.toBeVisible();
    await page.goto("/analysis");
    await expect(page.getByText(/异常支出/)).not.toBeVisible();
  });

  test("TC-AX3 分类月总额异常:超月均 2 倍触发(多笔小额累积)", async ({ page }) => {
    for (const d of [-1, -2, -3]) await addTx(page, 10000, 3, monthShift(d), "日用品"); // 购物月均 100
    for (let i = 0; i < 4; i++) await addTx(page, 6000, 3, monthShift(0), "购物小件"); // 本月 240 > 2×100
    await page.goto("/analysis");
    await expect(page.getByText(/「购物」本月合计/)).toBeVisible();
    await expect(page.getByText("¥240.00").first()).toBeVisible();
  });

  test("TC-AX4 噪音抑制:低于 ¥50 下限或基线不足 3 笔不报", async ({ page }) => {
    // 基线充足但金额低于下限:基线单笔 ¥2,当月 ¥40(>3 倍但 <¥50)
    for (const d of [-1, -2, -3]) await addTx(page, 200, 2, monthShift(d), "地铁");
    await addTx(page, 4000, 2, monthShift(0), "打车");
    // 基线不足 3 笔:人情分类只有 2 笔基线,当月大额也不报单笔
    await addTx(page, 5000, 7, monthShift(-1), "红包");
    await addTx(page, 5000, 7, monthShift(-2), "红包");
    await page.goto("/");
    await expect(page.getByText(/项异常支出/)).not.toBeVisible();
  });
});
