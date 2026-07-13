import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundRecords } from "@/db/schema";

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 编辑单条基金快照(市值/份额/涨跌幅/收益/日期)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!Number.isInteger(body?.marketValueCents) || body.marketValueCents <= 0)
    return NextResponse.json({ error: "市值必须是正整数(单位:分)" }, { status: 400 });
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    return NextResponse.json({ error: "日期必须是 YYYY-MM-DD" }, { status: 400 });

  const [row] = await db
    .update(fundRecords)
    .set({
      date: body.date,
      marketValueCents: body.marketValueCents,
      shares: body.shares ?? null,
      dayChangePct: body.dayChangePct ?? null,
      holdingProfitCents: body.holdingProfitCents ?? null,
    })
    .where(eq(fundRecords.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "快照不存在" }, { status: 404 });
  return NextResponse.json({ record: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const [row] = await db.delete(fundRecords).where(eq(fundRecords.id, id)).returning();
  if (!row) return NextResponse.json({ error: "快照不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
