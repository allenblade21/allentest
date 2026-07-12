import { NextResponse } from "next/server";
import { db } from "@/db";
import { fundRecords, funds } from "@/db/schema";

// 基金 API 占位:GET 返回主档与快照,写入在下个迭代实现
export async function GET() {
  const [fundList, records] = await Promise.all([
    db.select().from(funds),
    db.select().from(fundRecords).limit(200),
  ]);
  return NextResponse.json({ funds: fundList, records });
}

export async function POST() {
  return NextResponse.json({ error: "基金记录写入接口尚未实现" }, { status: 501 });
}
