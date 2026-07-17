// E2E 固定测试会话:setup-db.ts 建库时写入,playwright.config 注入 cookie
// 仅存在于独立测试库(data/test.db),与真实数据无关
export const TEST_USER = { username: "e2e", password: "e2e-password" };
export const TEST_SESSION_TOKEN = "e2e-fixed-session-token-0123456789abcdef";
