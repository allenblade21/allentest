// 认证核心:密码散列(Node 自带 scrypt,零依赖)、会话创建/校验/销毁
// 会话:随机 token 放 HttpOnly cookie,库中只存 sha256(token),可随时吊销
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE, SESSION_DAYS, sha256 } from "./auth-shared";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64);
  const expect = Buffer.from(hash, "hex");
  return calc.length === expect.length && crypto.timingSafeEqual(calc, expect);
}

// 建会话并写 cookie;返回明文 token(仅测试基建需要)
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  // 顺手清理过期会话
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return token;
}

export type SessionUser = { id: number; username: string };

// 读 cookie → 查会话 → 返回用户;无效返回 null
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, sha256(token)));
  if (!row || row.expiresAt < new Date().toISOString()) return null;
  return { id: row.id, username: row.username };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

// 注册开关:默认开;.env.local 设 ALLOW_REGISTER=0 可关闭(建好自己的账号后建议关)
export function registrationAllowed(): boolean {
  return process.env.ALLOW_REGISTER !== "0";
}

export function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== "string" || !/^[\w一-龥-]{2,20}$/.test(username))
    return "用户名需 2-20 位(字母/数字/中文/下划线/短横线)";
  if (typeof password !== "string" || password.length < 6 || password.length > 72)
    return "密码需 6-72 位";
  return null;
}
