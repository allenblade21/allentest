import Link from "next/link";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { categoryBreakdown, momCompare, monthlyTrend, shiftMonth, type Cat, type Tx } from "@/lib/analytics";
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

  const [txs, cats] = await Promise.all([
    db.select().from(transactions),
    db.select().from(categories),
  ]);
  const trend = monthlyTrend(txs as Tx[], month, 6);
  const breakdown = categoryBreakdown(txs as Tx[], cats as Cat[], month, "expense");
  const mom = momCompare(txs as Tx[], month);
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
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
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

      {/* 月度趋势柱状 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
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

      {/* 分类结构 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
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
