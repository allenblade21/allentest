import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { validateTx } from "@/lib/tx-validate";

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const err = validateTx(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const [row] = await db
    .update(transactions)
    .set({
      type: body.type,
      amountCents: body.amountCents,
      categoryId: body.categoryId ?? null,
      accountId: body.accountId ?? null,
      date: body.date,
      time: body.time ?? null,
      merchant: body.merchant ?? null,
      note: body.note ?? null,
    })
    .where(eq(transactions.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ transaction: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });

  const [row] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
