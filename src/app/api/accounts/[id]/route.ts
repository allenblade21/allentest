import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { validateAccount } from "@/lib/meta-validate";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const err = validateAccount(b);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db.update(accounts).set({ name: b.name.trim() }).where(eq(accounts.id, id)).returning();
  if (!row) return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  return NextResponse.json({ account: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  try {
    await db.delete(accounts).where(eq(accounts.id, id));
  } catch {
    return NextResponse.json({ error: "该账户使用中(有流水引用),不能删除" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
