// 消费分析:基于流水的聚合计算(纯函数,数据源为 transactions + categories)

export type Tx = {
  type: "expense" | "income" | "transfer";
  amountCents: number;
  categoryId: number | null;
  date: string; // YYYY-MM-DD
};
export type Cat = { id: number; name: string; icon: string | null; type: string };

// 近 n 个月的 month 列表(升序),含 anchor 月。anchor 形如 "2026-07"
export function recentMonths(anchor: string, n: number): string[] {
  const [y, m] = anchor.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type MonthStat = { month: string; expenseCents: number; incomeCents: number };

// 近 n 月收支趋势
export function monthlyTrend(txs: Tx[], anchor: string, n: number): MonthStat[] {
  const months = recentMonths(anchor, n);
  const map = new Map<string, MonthStat>(months.map((mo) => [mo, { month: mo, expenseCents: 0, incomeCents: 0 }]));
  for (const t of txs) {
    const mo = t.date.slice(0, 7);
    const s = map.get(mo);
    if (!s) continue;
    if (t.type === "expense") s.expenseCents += t.amountCents;
    else if (t.type === "income") s.incomeCents += t.amountCents;
  }
  return months.map((mo) => map.get(mo)!);
}

export type CategoryStat = {
  categoryId: number | null;
  name: string;
  icon: string | null;
  cents: number;
  pct: number; // 占当月总支出的百分比
};

// 某月分类结构(默认支出),按金额降序
export function categoryBreakdown(txs: Tx[], cats: Cat[], month: string, type: "expense" | "income" = "expense"): CategoryStat[] {
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const sum = new Map<number | null, number>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== type || t.date.slice(0, 7) !== month) continue;
    sum.set(t.categoryId, (sum.get(t.categoryId) ?? 0) + t.amountCents);
    total += t.amountCents;
  }
  const list: CategoryStat[] = [];
  for (const [cid, cents] of sum) {
    const c = cid != null ? catMap.get(cid) : undefined;
    list.push({
      categoryId: cid,
      name: c?.name ?? "未分类",
      icon: c?.icon ?? "🏷️",
      cents,
      pct: total > 0 ? (cents / total) * 100 : 0,
    });
  }
  return list.sort((a, b) => b.cents - a.cents);
}

export type MoM = { thisExpense: number; lastExpense: number; deltaPct: number | null };

// 环比:本月 vs 上月支出
export function momCompare(txs: Tx[], month: string): MoM {
  const last = shiftMonth(month, -1);
  let thisE = 0, lastE = 0;
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const mo = t.date.slice(0, 7);
    if (mo === month) thisE += t.amountCents;
    else if (mo === last) lastE += t.amountCents;
  }
  const deltaPct = lastE > 0 ? ((thisE - lastE) / lastE) * 100 : null;
  return { thisExpense: thisE, lastExpense: lastE, deltaPct };
}
