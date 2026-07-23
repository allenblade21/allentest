import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, categories, fundRecords, funds, transactions } from "@/db/schema";

// 导出 CSV(登录由 proxy 中央守卫保障):?type=transactions | funds
// 带 UTF-8 BOM 保证 Excel 直接打开中文不乱码;金额转元(两位小数)

const yuan = (cents: number) => (cents / 100).toFixed(2);
// CSV 转义 + 防公式注入(= + - @ 开头加前导单引号)
function cell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const TYPE_LABEL: Record<string, string> = { expense: "支出", income: "收入", transfer: "转账" };

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "transactions";
  let rows: string[];
  let filename: string;

  if (type === "funds") {
    const [fundList, records] = await Promise.all([
      db.select().from(funds),
      db.select().from(fundRecords),
    ]);
    const nameByCode = new Map(fundList.map((f) => [f.code, f.name]));
    rows = ["基金代码,基金名称,日期,市值(元),当日涨跌%,持有收益(元)"];
    for (const r of records.sort((a, b) => a.fundCode.localeCompare(b.fundCode) || a.date.localeCompare(b.date))) {
      rows.push([
        cell(r.fundCode), cell(nameByCode.get(r.fundCode) ?? ""), cell(r.date),
        cell(yuan(r.marketValueCents)), cell(r.dayChangePct ?? ""),
        cell(r.holdingProfitCents != null ? yuan(r.holdingProfitCents) : ""),
      ].join(","));
    }
    filename = "funds.csv";
  } else if (type === "transactions") {
    const [txs, cats, accts] = await Promise.all([
      db.select().from(transactions),
      db.select().from(categories),
      db.select().from(accounts),
    ]);
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const acctName = new Map(accts.map((a) => [a.id, a.name]));
    rows = ["日期,类型,金额(元),分类,账户,备注,来源"];
    for (const t of txs.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
      rows.push([
        cell(t.date), cell(TYPE_LABEL[t.type] ?? t.type), cell(yuan(t.amountCents)),
        cell(t.categoryId != null ? catName.get(t.categoryId) ?? "" : ""),
        cell(t.accountId != null ? acctName.get(t.accountId) ?? "" : ""),
        cell(t.note ?? ""), cell(t.source ?? "manual"),
      ].join(","));
    }
    filename = "transactions.csv";
  } else {
    return NextResponse.json({ error: "type 仅支持 transactions | funds" }, { status: 400 });
  }

  return new NextResponse("﻿" + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
