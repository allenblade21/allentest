import Link from "next/link";
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, categories, recurring, transactions } from "@/db/schema";
import { budgetProgress, overBudget } from "@/lib/budget";
import { dueSoon, dueStatus, type RecurringRow } from "@/lib/recurring";
import { detectAnomalies } from "@/lib/anomaly";
import type { Cat, Tx } from "@/lib/analytics";
import { formatCents } from "@/lib/money";
import { monthOf, today } from "@/lib/date";
import TransactionList from "@/components/TransactionList";
import AlertStrip, { type AlertTone } from "@/components/ui/AlertStrip";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

// ① 首页/流水:月度汇总 + 按日分组流水(列表部分支持多选批量操作)
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : monthOf(today());

  const [rows, cats, accts, budgetRows, recurringRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(like(transactions.date, `${month}-%`))
      .orderBy(desc(transactions.date), desc(transactions.id)),
    db.select().from(categories),
    db.select().from(accounts),
    db.select().from(budgets),
    db.select().from(recurring),
  ]);
  // 超支提醒:当月流水已按月过滤,直接用于预算执行计算
  const overs = overBudget(budgetProgress(budgetRows, rows as Tx[], cats as Cat[], month));
  // 周期支出到期提醒(与所选月份无关,始终按今天)
  const dues = dueSoon(recurringRows as RecurringRow[], today());

  let expense = 0;
  let income = 0;
  for (const t of rows) {
    if (t.type === "expense") expense += t.amountCents;
    if (t.type === "income") income += t.amountCents;
  }

  const [year, mon] = month.split("-");

  const due0 = dues[0];
  const over0 = overs[0];
  // 异常检测需要基线,查全量流水(个人数据量小,可接受)
  const allTxs = await db.select().from(transactions);
  const anomalies = detectAnomalies(allTxs as Tx[], cats as Cat[], month);

  // 提醒源:到期(琥珀)/ 超支(红 ⚠️)/ 异常(红 🔎)
  const alerts: { key: string; href: string; tone: AlertTone; icon: string; node: ReactNode }[] = [];
  if (due0) {
    alerts.push({
      key: "due", href: "/recurring", tone: "amber", icon: "📅",
      node: (
        <>
          {due0.name} <b className="tabular-nums">{formatCents(due0.amountCents)}</b>{" "}
          {dueStatus(due0.nextDate, today()) === "overdue" ? "已到期" : `${due0.nextDate.slice(5)} 到期`}
          {dues.length > 1 ? ` · 另有 ${dues.length - 1} 项` : ""}
        </>
      ),
    });
  }
  if (over0) {
    alerts.push({
      key: "over", href: `/analysis?month=${month}`, tone: "red", icon: "⚠️",
      node: (
        <>
          {over0.name} 已超预算 <b className="tabular-nums">{formatCents(over0.spentCents - over0.limitCents)}</b>
          {overs.length > 1 ? ` · 另有 ${overs.length - 1} 类` : ""}
        </>
      ),
    });
  }
  if (anomalies.length > 0) {
    alerts.push({
      key: "anomaly", href: `/analysis?month=${month}`, tone: "red", icon: "🔎",
      node: (
        <>
          检测到 <b>{anomalies.length}</b> 项异常支出(对比近 3 月)
        </>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* hero 卡:月份切换 + 结余 + 收支一行(简化版设计) */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2.5 flex items-center gap-2">
          <Link href={`/?month=${shiftMonth(month, -1)}`} className="px-1 text-xl text-neutral-400">‹</Link>
          <span className="font-bold">{year}年{Number(mon)}月</span>
          <Link href={`/?month=${shiftMonth(month, 1)}`} className="px-1 text-xl text-neutral-400">›</Link>
          <Link
            href="/import"
            className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            ⤓ 导入
          </Link>
        </div>
        <p className="text-xs text-neutral-500">本月结余</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {formatCents(income - expense, true)}
        </p>
        <p className="mt-1 flex gap-4 text-xs text-neutral-500 tabular-nums">
          <span>支出 <b className="text-neutral-900 dark:text-neutral-100">{formatCents(expense)}</b></span>
          <span>收入 <b className="text-neutral-900 dark:text-neutral-100">{formatCents(income)}</b></span>
        </p>
      </section>

      {/* 提醒源列表(页面架构 §二.1):新增提醒 = 往 alerts 里 push 一项 */}
      {alerts.map((a) => (
        <AlertStrip key={a.key} href={a.href} tone={a.tone} icon={a.icon}>
          {a.node}
        </AlertStrip>
      ))}

      <TransactionList rows={rows} categories={cats} accounts={accts} />
    </div>
  );
}
