import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fundRecords, funds } from "@/db/schema";
import { upsertFundRecord, validateFundRecord, type FundRecordInput } from "@/lib/fund-db";

// GET:基金主档 + 全部快照(前端页面主要直接查库,此接口备客户端用)
export async function GET() {
  const [fundList, records] = await Promise.all([
    db.select().from(funds),
    db.select().from(fundRecords).limit(1000),
  ]);
  return NextResponse.json({ funds: fundList, records });
}

// POST:手动记一笔基金快照(同基金同日覆盖)。前端发 code,内部映射为 fundCode。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input: Partial<FundRecordInput> = {
    fundCode: body?.code,
    name: body?.name,
    date: body?.date,
    marketValueCents: body?.marketValueCents,
    shares: body?.shares ?? null,
    dayChangePct: body?.dayChangePct ?? null,
    holdingProfitCents: body?.holdingProfitCents ?? null,
  };
  const err = validateFundRecord(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  await upsertFundRecord({ ...(input as FundRecordInput), source: "manual" });
  return NextResponse.json({ ok: true }, { status: 201 });
}
