import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { merchantRules, transactions } from "@/db/schema";
import { validateTx } from "@/lib/tx-validate";

// 待确认清单入账:批量写入正式流水表,并记住用户的商户→分类修正
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "没有要入账的记录" }, { status: 400 });
  }

  for (const [i, item] of items.entries()) {
    const err = validateTx(item);
    if (err) return NextResponse.json({ error: `第 ${i + 1} 条: ${err}` }, { status: 400 });
  }

  const rows = await db
    .insert(transactions)
    .values(
      items.map((item: Record<string, unknown>) => ({
        type: item.type as "expense" | "income",
        amountCents: item.amountCents as number,
        categoryId: (item.categoryId as number | null) ?? null,
        accountId: (item.accountId as number | null) ?? null,
        date: item.date as string,
        time: (item.time as string | null) ?? null,
        merchant: (item.merchant as string | null) ?? null,
        note: (item.note as string | null) ?? null,
        source: "ocr" as const,
        imagePath: (item.imagePath as string | null) ?? null,
      })),
    )
    .returning({ id: transactions.id });

  // 学习商户→分类映射:下次同商户自动推对分类
  for (const item of items) {
    const merchant = item.merchant as string | null;
    const categoryId = item.categoryId as number | null;
    if (merchant && categoryId) {
      await db
        .insert(merchantRules)
        .values({ keyword: merchant, categoryId })
        .onConflictDoUpdate({ target: merchantRules.keyword, set: { categoryId } });
    }
  }

  return NextResponse.json({ inserted: rows.length }, { status: 201 });
}
