import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";

const ACTIONS = ["category", "account", "date", "delete"] as const;
type Action = (typeof ACTIONS)[number];

// 批量操作:改分类/改账户/改日期/删除。返回操作前的完整行,供「一次撤销」
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = body?.action as Action;
  const ids = body?.ids;
  const value = body?.value;

  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "action 必须是 category/account/date/delete" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((n) => Number.isInteger(n) && n > 0)) {
    return NextResponse.json({ error: "ids 必须是非空的正整数数组" }, { status: 400 });
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: "一次最多操作 500 条" }, { status: 400 });
  }
  if (action === "category" || action === "account") {
    if (value !== null && !Number.isInteger(value)) {
      return NextResponse.json({ error: "value 必须是分类/账户 id 或 null" }, { status: 400 });
    }
  }
  if (action === "date" && !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))) {
    return NextResponse.json({ error: "value 必须是 YYYY-MM-DD" }, { status: 400 });
  }

  // 先取操作前的完整行,用于撤销
  const before = await db.select().from(transactions).where(inArray(transactions.id, ids));
  if (before.length === 0) {
    return NextResponse.json({ error: "没有匹配的记录" }, { status: 404 });
  }
  const hitIds = before.map((r) => r.id);

  switch (action) {
    case "category":
      await db.update(transactions).set({ categoryId: value }).where(inArray(transactions.id, hitIds));
      break;
    case "account":
      await db.update(transactions).set({ accountId: value }).where(inArray(transactions.id, hitIds));
      break;
    case "date":
      await db.update(transactions).set({ date: value }).where(inArray(transactions.id, hitIds));
      break;
    case "delete":
      await db.delete(transactions).where(inArray(transactions.id, hitIds));
      break;
  }

  return NextResponse.json({ affected: before.length, before });
}
