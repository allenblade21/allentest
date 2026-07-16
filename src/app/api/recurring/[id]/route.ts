import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurring } from "@/db/schema";
import { validateRecurring } from "@/lib/recurring-validate";

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const err = validateRecurring(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db
    .update(recurring)
    .set({
      name: body.name.trim(),
      amountCents: body.amountCents,
      categoryId: body.categoryId ?? null,
      cycle: body.cycle,
      nextDate: body.nextDate,
    })
    .where(eq(recurring.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ recurring: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "非法 id" }, { status: 400 });
  const [row] = await db.delete(recurring).where(eq(recurring.id, id)).returning();
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
