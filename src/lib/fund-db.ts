import { db } from "@/db";
import { fundRecords, funds } from "@/db/schema";

export type FundRecordInput = {
  fundCode: string;
  name: string;
  date: string;
  marketValueCents: number;
  shares?: number | null;
  dayChangePct?: number | null;
  holdingProfitCents?: number | null;
  source: "manual" | "ocr";
  imagePath?: string | null;
};

// 校验:返回错误提示或 null
export function validateFundRecord(r: Partial<FundRecordInput>): string | null {
  if (typeof r.fundCode !== "string" || !/^\d{6}$/.test(r.fundCode)) return "基金代码必须是 6 位数字";
  if (typeof r.name !== "string" || !r.name.trim()) return "基金名称必填";
  if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return "日期必须是 YYYY-MM-DD";
  if (!Number.isInteger(r.marketValueCents) || (r.marketValueCents as number) <= 0) return "市值必须是正整数(单位:分)";
  return null;
}

// upsert:主档按 code 归一;快照按 (code, date) 唯一 —— 同基金同日覆盖
export async function upsertFundRecord(r: FundRecordInput) {
  await db
    .insert(funds)
    .values({ code: r.fundCode, name: r.name })
    .onConflictDoUpdate({ target: funds.code, set: { name: r.name } });
  await db
    .insert(fundRecords)
    .values({
      fundCode: r.fundCode,
      date: r.date,
      marketValueCents: r.marketValueCents,
      shares: r.shares ?? null,
      dayChangePct: r.dayChangePct ?? null,
      holdingProfitCents: r.holdingProfitCents ?? null,
      source: r.source,
      imagePath: r.imagePath ?? null,
    })
    .onConflictDoUpdate({
      target: [fundRecords.fundCode, fundRecords.date],
      set: {
        marketValueCents: r.marketValueCents,
        shares: r.shares ?? null,
        dayChangePct: r.dayChangePct ?? null,
        holdingProfitCents: r.holdingProfitCents ?? null,
        source: r.source,
        imagePath: r.imagePath ?? null,
      },
    });
}
