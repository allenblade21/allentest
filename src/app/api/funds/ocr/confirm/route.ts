import { NextRequest, NextResponse } from "next/server";
import { upsertFundRecord, validateFundRecord } from "@/lib/fund-db";

// 基金待确认清单入账:逐条 upsert(同基金同日覆盖)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || items.length === 0) return NextResponse.json({ error: "没有要入账的记录" }, { status: 400 });

  for (const [i, item] of items.entries()) {
    const err = validateFundRecord(item);
    if (err) return NextResponse.json({ error: `第 ${i + 1} 条: ${err}` }, { status: 400 });
  }

  for (const item of items) {
    await upsertFundRecord({
      fundCode: item.fundCode,
      name: item.name,
      date: item.date,
      marketValueCents: item.marketValueCents,
      shares: item.shares ?? null,
      dayChangePct: item.dayChangePct ?? null,
      holdingProfitCents: item.holdingProfitCents ?? null,
      source: "ocr",
      imagePath: item.imagePath ?? null,
    });
  }
  return NextResponse.json({ inserted: items.length }, { status: 201 });
}
