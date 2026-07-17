import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, registrationAllowed, validateCredentials } from "@/lib/auth";

// 注册并自动登录;.env 设 ALLOW_REGISTER=0 时关闭注册
export async function POST(req: NextRequest) {
  if (!registrationAllowed()) {
    return NextResponse.json({ error: "注册已关闭(管理员在 .env.local 设置了 ALLOW_REGISTER=0)" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const err = validateCredentials(body.username, body.password);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username));
  if (dup) return NextResponse.json({ error: "用户名已存在" }, { status: 409 });

  const [user] = await db
    .insert(users)
    .values({ username: body.username, passwordHash: hashPassword(body.password) })
    .returning({ id: users.id, username: users.username });
  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
