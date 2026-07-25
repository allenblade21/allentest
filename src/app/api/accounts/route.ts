import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { validateAccount } from "@/lib/meta-validate";

export async function GET() {
  const rows = await db.select().from(accounts).orderBy(asc(accounts.id));
  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const err = validateAccount(b);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db.insert(accounts).values({ name: b.name.trim(), type: "other" }).returning();
  return NextResponse.json({ account: row }, { status: 201 });
}
