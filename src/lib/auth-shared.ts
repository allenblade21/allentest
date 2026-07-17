// 认证共享常量/纯函数:被 lib/auth.ts(页面/API 侧)与 src/proxy.ts(中央守卫)共同引用
import crypto from "node:crypto";

export const SESSION_COOKIE = "ledger_session";
export const SESSION_DAYS = 30;

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// 无需登录即可访问的路径前缀
export const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
