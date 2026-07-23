import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { askAI, financeContext } from "@/lib/ai";
import type { Cat, Tx } from "@/lib/analytics";
import { monthOf, today } from "@/lib/date";

// AI 财务问答:聚合账本事实 → LLM 回答(登录由 proxy 中央守卫保障)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 200) {
    return NextResponse.json({ error: "请输入 1-200 字的问题" }, { status: 400 });
  }
  const [txs, cats] = await Promise.all([
    db.select().from(transactions),
    db.select().from(categories),
  ]);
  const ctx = financeContext(txs as Tx[], cats as Cat[], monthOf(today()));
  try {
    const answer = await askAI(question, ctx);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI 服务不可用" }, { status: 502 });
  }
}
