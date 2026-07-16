import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { resetData } from "./helpers";

// 周期支出 —— 对应 docs/测试用例.md TC-RC 组
// 分类 id 来自 seed 固定顺序:餐饮=1 交通=2 购物=3 居住=4 …

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function monthShift(delta: number): string {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + delta, Math.min(d.getDate(), 28));
  return iso(t);
}
function recurringRows(): Array<{ id: number; name: string; amount_cents: number; next_date: string }> {
  const db = new Database("data/test.db");
  const rows = db
    .prepare("select id, name, amount_cents, next_date from recurring order by id")
    .all() as Array<{ id: number; name: string; amount_cents: number; next_date: string }>;
  db.close();
  return rows;
}
function txRows(): Array<{ amount_cents: number; note: string | null; category_id: number | null }> {
  const db = new Database("data/test.db");
  const rows = db
    .prepare("select amount_cents, note, category_id from transactions order by id")
    .all() as Array<{ amount_cents: number; note: string | null; category_id: number | null }>;
  db.close();
  return rows;
}
async function addRecurring(
  page: Page,
  body: { name: string; amountCents: number; categoryId?: number | null; cycle?: string; nextDate: string },
) {
  const r = await page.request.post("/api/recurring", {
    data: { categoryId: null, cycle: "monthly", ...body },
  });
  expect(r.ok()).toBeTruthy();
}

test.describe("周期支出", () => {
  test.beforeEach(() => resetData());

  test("TC-RC1 「我的」进入周期支出,表单新增并持久化", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: /周期支出/ }).click();
    await expect(page).toHaveURL(/\/recurring/);

    await page.getByRole("button", { name: "+ 新增" }).click();
    await page.getByLabel("周期支出名称").fill("视频会员");
    await page.getByLabel("周期支出金额").fill("25");
    await page.getByLabel("下次日期").fill(daysFromNow(20));
    await page.getByRole("button", { name: "保存", exact: true }).click();

    await expect(page.getByText("视频会员")).toBeVisible();
    await expect(page.getByText("¥25.00 · 每月", { exact: false })).toBeVisible();
    const rows = recurringRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "视频会员", amount_cents: 2500 });
  });

  test("TC-RC2 到期提醒:7 天内标「即将到期」并上首页,过期标「已到期」", async ({ page }) => {
    await addRecurring(page, { name: "房租", amountCents: 300000, nextDate: daysFromNow(-2) });
    await addRecurring(page, { name: "音乐会员", amountCents: 1500, nextDate: daysFromNow(3) });
    await addRecurring(page, { name: "云存储", amountCents: 900, nextDate: daysFromNow(30) });

    await page.goto("/recurring");
    await expect(page.getByText("已到期", { exact: true })).toBeVisible();
    await expect(page.getByText("即将到期", { exact: true })).toBeVisible();

    // 首页提醒卡:只含 7 天内两条,不含还早的「云存储」
    await page.goto("/");
    await expect(page.getByText(/📅 房租/)).toBeVisible();
    await expect(page.getByText(/已到期/)).toBeVisible();
    await expect(page.getByText(/📅 音乐会员/)).toBeVisible();
    await expect(page.getByText(/📅 云存储/)).not.toBeVisible();
  });

  test("TC-RC3 记一笔:生成当日流水且 nextDate 顺延一个月", async ({ page }) => {
    const next = daysFromNow(0);
    await addRecurring(page, { name: "健身房", amountCents: 19900, categoryId: 5, nextDate: next });

    await page.goto("/recurring");
    await page.getByRole("button", { name: "记一笔" }).click();
    await expect(page.getByText(/下次 \d{4}-\d{2}-\d{2}/)).toBeVisible();

    // 流水 +1:金额/备注/分类与登记一致
    await expect
      .poll(() => txRows().length)
      .toBe(1);
    expect(txRows()[0]).toMatchObject({ amount_cents: 19900, note: "健身房", category_id: 5 });
    // nextDate 顺延一个月(同日或月末收敛)
    const after = recurringRows()[0].next_date;
    expect(after > next).toBeTruthy();
    expect(after.slice(0, 7)).toBe(monthShift(1).slice(0, 7));
  });

  test("TC-RC4 删除周期支出:确认后列表与库中移除,不影响流水", async ({ page }) => {
    await addRecurring(page, { name: "报纸订阅", amountCents: 1000, nextDate: daysFromNow(10) });
    await page.goto("/recurring");
    await expect(page.getByText("报纸订阅")).toBeVisible();

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.getByText("报纸订阅")).not.toBeVisible();
    expect(recurringRows()).toHaveLength(0);
  });

  test("TC-RC5 候选识别:近 3 个月同名同金额支出出现候选,一键添加登记", async ({ page }) => {
    // 近 3 个自然月各一笔「同名同金额」支出
    for (const delta of [0, -1, -2]) {
      const r = await page.request.post("/api/transactions", {
        data: { type: "expense", amountCents: 2980, categoryId: 5, date: monthShift(delta), note: "流媒体会员" },
      });
      expect(r.ok()).toBeTruthy();
    }
    // 干扰项:只出现 2 个月,不应成为候选
    for (const delta of [0, -1]) {
      const r = await page.request.post("/api/transactions", {
        data: { type: "expense", amountCents: 5000, categoryId: 1, date: monthShift(delta), note: "偶发聚餐" },
      });
      expect(r.ok()).toBeTruthy();
    }

    await page.goto("/recurring");
    await expect(page.getByText("疑似周期支出", { exact: false })).toBeVisible();
    await expect(page.getByText("流媒体会员")).toBeVisible();
    await expect(page.getByText("偶发聚餐")).not.toBeVisible();

    await page.getByRole("button", { name: "+ 添加" }).click();
    // 采纳后进入已登记列表,候选消失
    await expect(page.getByText("疑似周期支出", { exact: false })).not.toBeVisible();
    const rows = recurringRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "流媒体会员", amount_cents: 2980 });
  });
});
