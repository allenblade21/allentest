import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";

// 流水 API 占位:GET 列表可用,写入在下个迭代实现
export async function GET() {
  const rows = await db.select().from(transactions).limit(100);
  return NextResponse.json({ transactions: rows });
}

export async function POST() {
  return NextResponse.json({ error: "记账写入接口尚未实现" }, { status: 501 });
}
