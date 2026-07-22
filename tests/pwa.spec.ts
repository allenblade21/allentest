import { test, expect } from "@playwright/test";

// PWA 加主屏 —— 对应 docs/测试用例.md TC-PW 组
// 前两例清空登录态:manifest 与图标是浏览器无凭证请求,必须绕过登录守卫可访问

test.describe("PWA", () => {
  test.describe("未登录资源可达", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("TC-PW1 manifest 未登录可访问且字段正确", async ({ page }) => {
      const res = await page.request.get("/manifest.webmanifest");
      expect(res.status()).toBe(200);
      const m = await res.json();
      expect(m.name).toBe("记账本");
      expect(m.display).toBe("standalone");
      expect(m.start_url).toBe("/");
      expect(m.icons).toHaveLength(2);
    });

    test("TC-PW2 图标未登录可访问且为 PNG", async ({ page }) => {
      for (const p of ["/icon-192.png", "/icon-512.png"]) {
        const res = await page.request.get(p);
        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toContain("image/png");
      }
    });
  });

  test("TC-PW3 页面注入 manifest 链接与 theme-color", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    expect(await page.locator('meta[name="theme-color"]').count()).toBeGreaterThan(0);
  });
});
