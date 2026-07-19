import Link from "next/link";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { categoryBreakdown, momCompare, monthlyTrend, shiftMonth, type Cat, type Tx } from "@/lib/analytics";
import { budgetProgress } from "@/lib/budget";
import { detectAnomalies } from "@/lib/anomaly";
import { formatCents } from "@/lib/money";
import { monthOf, today } from "@/lib/date";

export const dynamic = "force-dynamic";

// P2 · 消费分析:环比、月度趋势、分类结构
export default async function AnalysisPage({
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
  const trend = monthlyTrend(txs as Tx[], month, 6);
  const breakdown = categoryBreakdown(txs as Tx[], cats as Cat[], month, "expense");
  const mom = momCompare(txs as Tx[], month);
  const budgetList = budgetProgress(budgetRows, txs as Tx[], cats as Cat[], month);
  const anomalies = detectAnomalies(txs as Tx[], cats as Cat[], month);
  const [year, mon] = month.split("-");

  const maxTrend = Math.max(...trend.map((t) => t.expenseCents), 1);
  const W = 320, H = 96, pad = 4, gap = 8;
  const bw = (W - gap * (trend.length - 1)) / trend.length;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4 pb-16">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-lg">‹</Link>
        <h1 className="font-bold">消费分析</h1>
        <span className="ml-auto flex items-center gap-2 text-sm">
          <Link href={`/analysis?month=${shiftMonth(month, -1)}`} className="px-1 text-neutral-400">‹</Link>
          {year}年{Number(mon)}月
          <Link href={`/analysis?month=${shiftMonth(month, 1)}`} className="px-1 text-neutral-400">›</Link>
        </span>
      </div>

      {/* 环比卡 */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs text-neutral-500">本月支出</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-2xl font-bold tabular-nums">{formatCents(mom.thisExpense)}</p>
          {mom.deltaPct != null && (
            <span className={`text-sm font-semibold ${mom.deltaPct > 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
              {mom.deltaPct > 0 ? "↑" : "↓"} {Math.abs(mom.deltaPct).toFixed(1)}% 环比
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-500">上月 {formatCents(mom.lastExpense)}</p>
      </section>

      {/* 异常支出(P3,ADR 0014):有异常才显示 */}
      {anomalies.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">🔎 异常支出 {anomalies.length} 项(对比近 3 月)</p>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            {anomalies.slice(0, 5).map((a, i) => (
              <p key={i} className="flex items-center gap-1.5 text-red-800 dark:text-red-200">
                <span>{a.icon}</span>
                <span className="min-w-0 flex-1 truncate">
                  {a.kind === "tx" ? `单笔「${a.name}」` : `「${a.name}」本月合计`}
                  <b className="tabular-nums"> {formatCents(a.amountCents)}</b>
                </span>
                <span className="text-xs text-red-500 dark:text-red-400 tabular-nums">
                  {a.kind === "tx" ? "常见单笔" : "月均"} {formatCents(a.baselineCents)}
                </span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 月度趋势柱状 */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-3 text-xs text-neutral-500">近 6 个月支出趋势</p>
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="月度支出趋势">
          {trend.map((t, i) => {
            const h = (t.expenseCents / maxTrend) * (H - pad);
            const x = i * (bw + gap);
            const isCur = t.month === month;
            return (
              <g key={t.month}>
                <rect x={x} y={H - h} width={bw} height={h} rx="3" className={isCur ? "fill-emerald-700 dark:fill-emerald-400" : "fill-neutral-200 dark:fill-neutral-700"} />
                <text x={x + bw / 2} y={H + 12} fontSize="9" textAnchor="middle" className="fill-neutral-400">{Number(t.month.slice(5))}月</text>
              </g>
            );
          })}
        </svg>
      </section>

      {/* 分类预算执行 */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-neutral-500">分类预算</p>
          <Link href="/budget" className="text-xs text-emerald-700 dark:text-emerald-400">设置 ›</Link>
        </div>
        {budgetList.length === 0 ? (
          <p className="text-sm text-neutral-500">
            还没有设置预算。<Link href="/budget" className="text-emerald-700 dark:text-emerald-400">去设置预算</Link>,超支会在这里和首页提醒。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {budgetList.map((b) => (
              <div key={b.categoryId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{b.icon}</span>{b.name}
                    {b.over && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">超支</span>
                    )}
                  </span>
                  <span className="tabular-nums text-xs text-neutral-500">
                    <b className={`text-sm ${b.over ? "text-red-600" : "text-neutral-900 dark:text-neutral-100"}`}>{formatCents(b.spentCents)}</b>
                    {" / "}{formatCents(b.limitCents)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full ${b.over ? "bg-red-500" : b.pct >= 80 ? "bg-amber-500" : "bg-emerald-600 dark:bg-emerald-500"}`}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 分类结构 */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-3 text-xs text-neutral-500">本月支出分类结构</p>
        {breakdown.length === 0 ? (
          <p className="text-sm text-neutral-500">本月还没有支出记录。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {breakdown.map((c) => (
              <div key={c.categoryId ?? "none"} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{c.icon}</span>{c.name}
                    <span className="text-xs text-neutral-400">{c.pct.toFixed(0)}%</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatCents(c.cents)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${Math.max(c.pct, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="px-1 text-xs text-neutral-400">预算建议 / 异常提醒 / 订阅识别为后续 P2 迭代。</p>
    </div>
  );
}
