import Link from "next/link";
import { db } from "@/db";
import { fundRecords, funds } from "@/db/schema";
import { summarize, fmtPct, type FundRecordRow } from "@/lib/fund";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

// ④ 基金 · 投资总览 + 持仓列表
export default async function FundsPage() {
  const [fundList, records] = await Promise.all([
    db.select().from(funds),
    db.select().from(fundRecords),
  ]);
  const ov = summarize(fundList, records as FundRecordRow[]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">基金</h1>

      {/* 投资总览卡 */}
      <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs text-neutral-500">总市值</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{formatCents(ov.totalMarketValueCents)}</p>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">持有收益</p>
            <p className="font-semibold tabular-nums">{ov.list.length ? formatCents(ov.totalHoldingProfitCents, true) : "--"}</p>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">今日收益</p>
            <p className="font-semibold tabular-nums">{ov.list.length ? formatCents(ov.todayProfitCents, true) : "--"}</p>
          </div>
        </div>
      </section>

      {/* 操作行:下沉为等宽双按钮(页面架构·按键位置原则) */}
      <div className="flex gap-2.5">
        <Link href="/funds/import" className="flex-1 rounded-xl bg-neutral-100 py-2.5 text-center text-sm font-medium dark:bg-neutral-800">
          📷 导入持仓截图
        </Link>
        <Link href="/funds/new" className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-center text-sm font-medium text-white">
          ＋ 手动记一笔
        </Link>
      </div>

      {ov.list.length === 0 ? (
        <section className="rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">
            还没有基金记录。点「导入持仓截图」用 OCR 批量录入,或
            <Link href="/funds/new" className="text-emerald-700 dark:text-emerald-400"> 手动记一笔</Link>。
            同一基金按代码归一,自动汇总各期涨跌。
          </p>
        </section>
      ) : (
        <>
          <p className="px-1 text-xs text-neutral-500">持有基金 · {ov.list.length} 只</p>
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white border border-neutral-200 dark:border-neutral-800 dark:divide-neutral-800 dark:bg-neutral-900">
            {ov.list.map((f) => (
              <Link key={f.code} href={`/funds/${f.code}`} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm dark:bg-neutral-800">📈</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="block text-xs text-neutral-500">
                    {f.code} · {formatCents(f.latest.marketValueCents)}
                  </span>
                </span>
                <span className={`text-sm font-semibold tabular-nums ${(f.latest.dayChangePct ?? 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
                  {fmtPct(f.latest.dayChangePct)}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
