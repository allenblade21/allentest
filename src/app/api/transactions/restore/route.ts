import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { TX_TYPES } from "@/lib/tx-validate";

// 撤销批量操作:用操作前的行整体还原(删除的重新插入,改过的覆盖回旧值)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
    return NextResponse.json({ error: "rows 必须是 1~500 条的数组" }, { status: 400 });
  }
  for (const r of rows) {
    if (!Number.isInteger(r?.id) || !TX_TYPES.includes(r?.type) || !Number.isInteger(r?.amountCents)) {
      return NextResponse.json({ error: "rows 中存在非法记录" }, { status: 400 });
    }
  }

  const ids = rows.map((r: { id: number }) => r.id);
  await db.delete(transactions).where(inArray(transactions.id, ids));
  await db.insert(transactions).values(
    rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      type: r.type as "expense" | "income" | "transfer",
      amountCents: r.amountCents as number,
      categoryId: (r.categoryId as number | null) ?? null,
      accountId: (r.accountId as number | null) ?? null,
      date: r.date as string,
      time: (r.time as string | null) ?? null,
      merchant: (r.merchant as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      source: r.source === "ocr" ? ("ocr" as const) : ("manual" as const),
      imagePath: (r.imagePath as string | null) ?? null,
      createdAt: (r.createdAt as string) ?? undefined,
    })),
  );

  return NextResponse.json({ restored: rows.length });
}
