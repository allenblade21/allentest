import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }
  const [user] = await db.select().from(users).where(eq(users.username, username));
  // 用户不存在与密码错误返回同一文案,避免枚举用户名
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
