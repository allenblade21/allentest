// 净资产与月度报告:基于流水/账户/基金快照的聚合计算(纯函数)

import type { Cat, Tx } from "./analytics";
import { categoryBreakdown, shiftMonth } from "./analytics";

// 现金结余 = 账户初始余额合计 + 全部历史(收入 - 支出);transfer 不影响总额
export function cashBalanceCents(
  txs: Tx[],
  accounts: { initialBalanceCents: number }[],
): number {
  let v = accounts.reduce((a, x) => a + x.initialBalanceCents, 0);
  for (const t of txs) {
    if (t.type === "income") v += t.amountCents;
    if (t.type === "expense") v -= t.amountCents;
  }
  return v;
}

export type NetWorth = { cashCents: number; fundCents: number; totalCents: number };

export function netWorth(cashCents: number, fundCents: number): NetWorth {
  return { cashCents, fundCents, totalCents: cashCents + fundCents };
}

export type TopTx = { note: string; amountCents: number; date: string; catName: string };

export type MonthlyReport = {
  month: string;
  expenseCents: number;
  incomeCents: number;
  balanceCents: number;
  prevExpenseCents: number; // 上月支出(环比基数)
  momPct: number | null; // 支出环比,上月为 0 时为 null
  topCats: { name: string; icon: string | null; cents: number; pct: number }[];
  topTxs: TopTx[];
};

export function monthlyReport(
  txs: (Tx & { note?: string | null })[],
  cats: Cat[],
  month: string,
  topN = 5,
): MonthlyReport {
  const inMonth = txs.filter((t) => t.date.startsWith(month + "-"));
  let expenseCents = 0, incomeCents = 0;
  for (const t of inMonth) {
    if (t.type === "expense") expenseCents += t.amountCents;
    if (t.type === "income") incomeCents += t.amountCents;
  }
  const prev = shiftMonth(month, -1);
  const prevExpenseCents = txs
    .filter((t) => t.type === "expense" && t.date.startsWith(prev + "-"))
    .reduce((a, t) => a + t.amountCents, 0);
  const momPct = prevExpenseCents > 0
    ? ((expenseCents - prevExpenseCents) / prevExpenseCents) * 100
    : null;
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const topCats = categoryBreakdown(inMonth, cats, month).slice(0, topN).map((r) => ({
    name: r.name,
    icon: r.icon,
    cents: r.cents,
    pct: r.pct,
  }));
  const topTxs = inMonth
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 3)
    .map((t) => ({
      note: t.note || catMap.get(t.categoryId ?? -1)?.name || "支出",
      amountCents: t.amountCents,
      date: t.date,
      catName: catMap.get(t.categoryId ?? -1)?.name ?? "未分类",
    }));
  return { month, expenseCents, incomeCents, balanceCents: incomeCents - expenseCents, prevExpenseCents, momPct, topCats, topTxs };
}
