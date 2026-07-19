import Link from "next/link";
import { db } from "@/db";
import { accounts, funds, fundRecords, transactions } from "@/db/schema";
import { summarize } from "@/lib/fund";
import { cashBalanceCents, netWorth } from "@/lib/report";
import type { Tx } from "@/lib/analytics";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

// P3 · 净资产总览:现金结余(账户初始 + 历史收支)+ 基金最新市值(ADR 0013)
export default async function NetWorthPage() {
  const [txs, accts, fundRows, recordRows] = await Promise.all([
    db.select().from(transactions),
    db.select().from(accounts),
    db.select().from(funds),
    db.select().from(fundRecords),
  ]);
  const cash = cashBalanceCents(txs as Tx[], accts);
  const fund = summarize(fundRows, recordRows).totalMarketValueCents;
  const nw = netWorth(cash, fund);
  const pct = (v: number) => (nw.totalCents > 0 ? Math.max(0, Math.min(100, (v / nw.totalCents) * 100)) : 0);

  const card = "rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-xl text-neutral-400">‹</Link>
        <h1 className="font-bold">净资产总览</h1>
      </div>
      <section className={card}>
        <p className="text-xs text-neutral-500">净资产</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{formatCents(nw.totalCents)}</p>
      </section>
      <section className={`${card} flex flex-col gap-3`}>
        <div>
          <div className="flex justify-between text-sm">
            <span>💰 现金结余</span>
            <b className="tabular-nums">{formatCents(nw.cashCents)}</b>
          </div>
          <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${pct(nw.cashCents)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span>📈 基金市值</span>
            <b className="tabular-nums">{formatCents(nw.fundCents)}</b>
          </div>
          <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(nw.fundCents)}%` }} />
          </div>
        </div>
      </section>
      <p className="px-1 text-xs text-neutral-500">
        现金结余 = 账户初始余额 + 全部历史收入 − 支出;基金按各基金最新一期快照市值合计。
        <Link href="/funds" className="text-emerald-700 dark:text-emerald-400"> 管理基金 ›</Link>
      </p>
    </div>
  );
}
