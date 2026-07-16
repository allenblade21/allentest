import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(budgets);
  return NextResponse.json({ budgets: rows });
}

// 批量保存:limitCents > 0 → upsert;= 0 → 删除该分类预算
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) return NextResponse.json({ error: "items 必须是数组" }, { status: 400 });
  for (const [i, it] of items.entries()) {
    if (!Number.isInteger(it?.categoryId) || it.categoryId <= 0)
      return NextResponse.json({ error: `第 ${i + 1} 条: categoryId 非法` }, { status: 400 });
    if (!Number.isInteger(it?.limitCents) || it.limitCents < 0)
      return NextResponse.json({ error: `第 ${i + 1} 条: limitCents 必须是非负整数(分)` }, { status: 400 });
  }

  for (const it of items) {
    if (it.limitCents > 0) {
      await db
        .insert(budgets)
        .values({ categoryId: it.categoryId, limitCents: it.limitCents })
        .onConflictDoUpdate({ target: budgets.categoryId, set: { limitCents: it.limitCents } });
    } else {
      await db.delete(budgets).where(eq(budgets.categoryId, it.categoryId));
    }
  }
  const rows = await db.select().from(budgets);
  return NextResponse.json({ budgets: rows });
}
