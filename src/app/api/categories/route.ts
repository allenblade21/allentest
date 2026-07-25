import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { validateCategory } from "@/lib/meta-validate";

export async function GET() {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const err = validateCategory(b);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const [row] = await db.insert(categories)
    .values({ name: b.name.trim(), type: b.type ?? "expense", icon: b.icon ?? "🏷️", sortOrder: 99 })
    .returning();
  return NextResponse.json({ category: row }, { status: 201 });
}
