import Link from "next/link";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { budgetProgress, overBudget } from "@/lib/budget";
import { monthlyReport } from "@/lib/report";
import { shiftMonth } from "@/lib/analytics";
import type { Cat, Tx } from "@/lib/analytics";
import { formatCents } from "@/lib/money";
import { monthOf, today } from "@/lib/date";

export const dynamic = "force-dynamic";

// P3 · 月度报告:当月收支结余、支出环比、分类 Top、单笔支出 Top、预算执行
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : monthOf(today());
  const [txs, cats, budgetRows] = await Promise.all([
    db.select().from(transactions),
    db.select().from(categories),
    db.select().from(budgets),
  ]);
  const r = monthlyReport(txs as (Tx & { note?: string | null })[], cats as Cat[], month);
  const monthTxs = (txs as Tx[]).filter((t) => t.date.startsWith(month + "-"));
  const bp = budgetProgress(budgetRows, monthTxs, cats as Cat[], month);
  const overs = overBudget(bp);
  const [y, m] = month.split("-");

  const card = "rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-xl text-neutral-400">‹</Link>
        <h1 className="font-bold">月度报告</h1>
        <span className="ml-auto flex items-center gap-1 text-sm">
          <Link href={`/report?month=${shiftMonth(month, -1)}`} className="px-1 text-xl text-neutral-400">‹</Link>
          <b>{y}年{Number(m)}月</b>
          <Link href={`/report?month=${shiftMonth(month, 1)}`} className="px-1 text-xl text-neutral-400">›</Link>
        </span>
      </div>

      <section className={card}>
        <p className="text-xs text-neutral-500">本月结余</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{formatCents(r.balanceCents, true)}</p>
        <p className="mt-1 flex gap-4 text-xs text-neutral-500 tabular-nums">
          <span>支出 <b className="text-neutral-900 dark:text-neutral-100">{formatCents(r.expenseCents)}</b></span>
          <span>收入 <b className="text-neutral-900 dark:text-neutral-100">{formatCents(r.incomeCents)}</b></span>
        </p>
        {r.momPct !== null && (
          <p className="mt-1 text-xs text-neutral-500">
            支出环比上月({formatCents(r.prevExpenseCents)}):
            <b className={r.momPct > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
              {r.momPct > 0 ? "+" : ""}{r.momPct.toFixed(1)}%
            </b>
          </p>
        )}
      </section>

      <section className={`${card} flex flex-col gap-2.5`}>
        <p className="text-xs text-neutral-500">支出分类 Top{r.topCats.length > 0 ? ` ${r.topCats.length}` : ""}</p>
        {r.topCats.length === 0 ? (
          <p className="text-sm text-neutral-500">本月暂无支出</p>
        ) : r.topCats.map((c) => (
          <div key={c.name}>
            <div className="flex justify-between text-sm">
              <span>{c.icon} {c.name}</span>
              <b className="tabular-nums">{formatCents(c.cents)} <span className="font-normal text-neutral-400">{c.pct.toFixed(0)}%</span></b>
            </div>
            <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.min(100, c.pct)}%` }} />
            </div>
          </div>
        ))}
      </section>

      {r.topTxs.length > 0 && (
        <section className={`${card} flex flex-col gap-2`}>
          <p className="text-xs text-neutral-500">最大单笔支出</p>
          {r.topTxs.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{t.note}<span className="text-xs text-neutral-400"> · {t.catName} · {t.date.slice(5)}</span></span>
              <b className="tabular-nums">{formatCents(t.amountCents)}</b>
            </div>
          ))}
        </section>
      )}

      <section className={card}>
        <p className="text-xs text-neutral-500">预算执行</p>
        {bp.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">未设置预算,<Link href="/budget" className="text-emerald-700 dark:text-emerald-400">去设置 ›</Link></p>
        ) : (
          <p className="mt-1 text-sm">
            {bp.length} 类预算,{overs.length === 0 ? "全部在额度内 ✅" : <>其中 <b className="text-red-600 dark:text-red-400">{overs.length} 类超支</b></>}
            <Link href={`/analysis?month=${month}`} className="ml-2 text-emerald-700 dark:text-emerald-400">看明细 ›</Link>
          </p>
        )}
      </section>
    </div>
  );
}
