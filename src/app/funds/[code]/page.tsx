import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundRecords, funds } from "@/db/schema";
import { buildSeries, fmtPct, type FundRecordRow } from "@/lib/fund";
import { formatCents } from "@/lib/money";
import FundSnapshots from "@/components/FundSnapshots";

export const dynamic = "force-dynamic";

// ⑤ 基金详情 · 跨期汇总(表 + 走势图)
export default async function FundDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [fund] = await db.select().from(funds).where(eq(funds.code, code));
  const records = (await db.select().from(fundRecords).where(eq(fundRecords.fundCode, code))) as FundRecordRow[];
  const series = buildSeries(records);

  if (!fund || series.points.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/funds" className="text-lg">‹</Link>
          <h1 className="font-bold">基金详情</h1>
        </div>
        <p className="text-sm text-neutral-500">未找到该基金的快照。</p>
      </div>
    );
  }

  const latest = series.points[series.points.length - 1];

  // 走势图坐标(市值序列归一化到 viewBox)
  const vals = series.points.map((p) => p.marketValueCents);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 300, H = 80, pad = 6;
  const pts = series.points
    .map((p, i) => {
      const x = series.points.length === 1 ? W / 2 : pad + (i / (series.points.length - 1)) * (W - 2 * pad);
      const y = H - pad - ((p.marketValueCents - min) / span) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4 pb-16">
      <div className="flex items-center gap-3">
        <Link href="/funds" className="text-lg">‹</Link>
        <h1 className="truncate font-bold">{fund.name}</h1>
        <span className="ml-auto rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">{fund.code}</span>
      </div>

      {/* 汇总 */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">最新市值</p>
          <p className="font-semibold tabular-nums">{formatCents(latest.marketValueCents)}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">持有收益</p>
          <p className="font-semibold tabular-nums">{latest.holdingProfitCents != null ? formatCents(latest.holdingProfitCents, true) : "—"}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">持有期涨跌</p>
          <p className="font-semibold tabular-nums">{fmtPct(series.totalChangePct)}</p>
        </div>
      </div>

      {/* 走势图 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <div className="mb-2 flex justify-between text-xs text-neutral-500">
          <span>市值走势</span>
          <span>近 {series.points.length} 期</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" preserveAspectRatio="none" role="img" aria-label="市值走势">
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeWidth="0.5" className="text-neutral-200 dark:text-neutral-700" />
          <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-700 dark:text-emerald-400" />
        </svg>
      </section>

      {/* 历史快照表 + 删除 */}
      <FundSnapshots
        points={series.points.map((p) => ({
          id: p.id, date: p.date, marketValueCents: p.marketValueCents,
          dayChangePct: p.dayChangePct, periodChangePct: p.periodChangePct,
          holdingProfitCents: p.holdingProfitCents,
        }))}
      />

      <div className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
        汇总:持有期 <b>{fmtPct(series.totalChangePct)}</b>
        {series.maxPoint && <> · 最高 {series.maxPoint.date}</>}
        {series.minPoint && <> · 最低 {series.minPoint.date}</>}
      </div>

      <Link href={`/funds/new?code=${fund.code}&name=${encodeURIComponent(fund.name)}`} className="rounded-xl border border-dashed border-neutral-300 py-2.5 text-center text-sm text-neutral-500 dark:border-neutral-700">
        + 补录 / 修正一期快照
      </Link>
    </div>
  );
}
