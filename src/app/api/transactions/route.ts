import { NextRequest, NextResponse } from "next/server";
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { validateTx, type TxType } from "@/lib/tx-validate";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM,可选
  const query = db.select().from(transactions);
  const rows = month
    ? await query.where(like(transactions.date, `${month}-%`)).orderBy(desc(transactions.date), desc(transactions.id))
    : await query.orderBy(desc(transactions.date), desc(transactions.id)).limit(200);
  return NextResponse.json({ transactions: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const err = validateTx(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const [row] = await db
    .insert(transactions)
    .values({
      type: body.type as TxType,
      amountCents: body.amountCents,
      categoryId: body.categoryId ?? null,
      accountId: body.accountId ?? null,
      date: body.date,
      time: body.time ?? null,
      merchant: body.merchant ?? null,
      note: body.note ?? null,
      source: body.source === "ocr" ? "ocr" : "manual",
      imagePath: body.imagePath ?? null,
    })
    .returning();
  return NextResponse.json({ transaction: row }, { status: 201 });
}
