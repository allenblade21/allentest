// 中央访问守卫(Next 16 proxy,默认 Node runtime,可直查 SQLite):
// 除 PUBLIC_PATHS 外的所有页面与 API 都要求有效会话——新增路由默认受保护
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { isPublicPath, SESSION_COOKIE, sha256 } from "@/lib/auth-shared";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const [row] = await db
      .select({ expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.tokenHash, sha256(token)));
    if (row && row.expiresAt >= new Date().toISOString()) return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // 静态资源放行,其余全部过守卫
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
