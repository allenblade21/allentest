import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurring, transactions } from "@/db/schema";
import { advanceDate } from "@/lib/recurring";
import { today } from "@/lib/date";

// 记一笔并顺延:按周期支出生成一条真实流水(记账日=今天),nextDate 前进一个周期
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "非法 id" }, { status: 400 });

  const [r] = await db.select().from(recurring).where(eq(recurring.id, id));
  if (!r) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  const [tx] = await db
    .insert(transactions)
    .values({
      type: "expense",
      amountCents: r.amountCents,
      categoryId: r.categoryId,
      accountId: null,
      date: today(),
      note: r.name,
      source: "manual",
    })
    .returning();

  const nextDate = advanceDate(r.nextDate, r.cycle);
  await db.update(recurring).set({ nextDate }).where(eq(recurring.id, id));

  return NextResponse.json({ transaction: tx, nextDate }, { status: 201 });
}
