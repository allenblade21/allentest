import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recurring } from "@/db/schema";
import { validateRecurring } from "@/lib/recurring-validate";

export async function GET() {
  const rows = await db.select().from(recurring);
  return NextResponse.json({ recurring: rows });
}

// 新增一条周期支出
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const err = validateRecurring(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db
    .insert(recurring)
    .values({
      name: body.name.trim(),
      amountCents: body.amountCents,
      categoryId: body.categoryId ?? null,
      cycle: body.cycle,
      nextDate: body.nextDate,
    })
    .returning();
  return NextResponse.json({ recurring: row }, { status: 201 });
}
