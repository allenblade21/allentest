import { test, expect, type Page } from "@playwright/test";
import { resetData, countRows, FAKE_PNG } from "./helpers";

// OCR 批量导入 —— 对应 docs/测试用例.md TC-O 组
// 服务端以 OCR_MOCK=1 运行:识别固定返回 3 条正常记录 + 1 条存疑记录

async function uploadAndRecognize(page: Page) {
  await page.goto("/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bill.png",
    mimeType: "image/png",
    buffer: FAKE_PNG,
  });
  await page.getByRole("button", { name: /开始识别/ }).click();
  await expect(page.getByText(/待确认 \d+ 笔/)).toBeVisible({ timeout: 30_000 });
}

test.describe("OCR 导入", () => {
  test.beforeEach(() => resetData());

  test("TC-O1 识别生成待确认清单,存疑项标黄且默认不勾选", async ({ page }) => {
    await uploadAndRecognize(page);
    await expect(page.getByText("待确认 4 笔")).toBeVisible();
    await expect(page.getByText("存疑", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "已选 3 / 4" })).toBeVisible();
    // 此时尚未入账
    expect(countRows("transactions")).toBe(0);
  });

  test("TC-O2 入账后写入流水、汇总正确、带 OCR 标记,并学习商户映射", async ({ page }) => {
    await uploadAndRecognize(page);
    await page.getByRole("button", { name: "入账", exact: true }).click();
    await page.waitForURL("/");

    await expect(page.getByText("¥88.40").first()).toBeVisible(); // 19.90+23.50+45.00
    await expect(page.getByText("📎").first()).toBeVisible(); // OCR 来源标记
    expect(countRows("transactions")).toBe(3);
    expect(countRows("merchant_rules")).toBeGreaterThan(0); // 商户→分类映射已学习
  });

  test("TC-O3 重复导入同一批:全部标疑似重复且默认不勾选", async ({ page }) => {
    // 第一轮入账
    await uploadAndRecognize(page);
    await page.getByRole("button", { name: "入账", exact: true }).click();
    await page.waitForURL("/");

    // 第二轮识别同一张图
    await uploadAndRecognize(page);
    await expect(page.getByText("疑似重复").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "已选 0 / 4" })).toBeVisible();
  });

  test("TC-O4 未选择图片时点识别给出提示", async ({ page }) => {
    await page.goto("/import");
    await expect(page.getByRole("button", { name: /开始识别/ })).not.toBeVisible();
    await expect(page.getByText("添加截图")).toBeVisible();
  });

  test("TC-O5 「已选」按钮可一键全选(含存疑项)", async ({ page }) => {
    await uploadAndRecognize(page);
    await page.getByRole("button", { name: "已选 3 / 4" }).click();
    await expect(page.getByRole("button", { name: "已选 4 / 4" })).toBeVisible();
  });
});
