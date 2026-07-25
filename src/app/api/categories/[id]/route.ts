import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { validateCategory } from "@/lib/meta-validate";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const err = validateCategory(b);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db.update(categories)
    .set({ name: b.name.trim(), ...(b.icon !== undefined ? { icon: b.icon } : {}) })
    .where(eq(categories.id, id)).returning();
  if (!row) return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  return NextResponse.json({ category: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  try {
    await db.delete(categories).where(eq(categories.id, id));
  } catch {
    // 外键约束:流水/预算/周期支出/商户映射仍在引用
    return NextResponse.json({ error: "该分类使用中(流水/预算/周期支出引用),不能删除" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
