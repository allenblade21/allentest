// 异常支出检测(纯函数,ADR 0014):以近 3 个自然月为基线,当月偏离即标异常
// 规则:单笔 > 3× 该分类基线单笔均值(基线需 ≥3 笔);分类月总额 > 2× 基线月均值。
// 均低于 minCents(默认 ¥50)不报,避免小额噪音。

import type { Cat, Tx } from "./analytics";
import { shiftMonth } from "./analytics";

export type Anomaly = {
  kind: "tx" | "category";
  name: string; // 单笔=备注/分类名;分类=分类名
  icon: string | null;
  amountCents: number; // 当月实际(单笔金额 / 分类月总额)
  baselineCents: number; // 基线(单笔均值 / 月均总额)
  date?: string;
};

export function detectAnomalies(
  txs: (Tx & { note?: string | null })[],
  cats: Cat[],
  month: string,
  opts = { txMultiple: 3, catMultiple: 2, minCents: 5000 },
): Anomaly[] {
  const baseMonths = [1, 2, 3].map((i) => shiftMonth(month, -i));
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const inBase = txs.filter((t) => t.type === "expense" && baseMonths.some((m) => t.date.startsWith(m + "-")));
  const inCur = txs.filter((t) => t.type === "expense" && t.date.startsWith(month + "-"));
  const out: Anomaly[] = [];

  // 按分类聚合基线
  const base = new Map<number | null, { totalCents: number; count: number }>();
  for (const t of inBase) {
    const b = base.get(t.categoryId) ?? { totalCents: 0, count: 0 };
    b.totalCents += t.amountCents; b.count += 1;
    base.set(t.categoryId, b);
  }

  // 单笔异常
  for (const t of inCur) {
    const b = base.get(t.categoryId);
    if (!b || b.count < 3) continue;
    const avg = b.totalCents / b.count;
    if (t.amountCents >= opts.minCents && t.amountCents > opts.txMultiple * avg) {
      const c = t.categoryId != null ? catMap.get(t.categoryId) : undefined;
      out.push({
        kind: "tx",
        name: t.note || c?.name || "支出",
        icon: c?.icon ?? "🏷️",
        amountCents: t.amountCents,
        baselineCents: Math.round(avg),
        date: t.date,
      });
    }
  }

  // 分类月总额异常
  const curByCat = new Map<number | null, number>();
  for (const t of inCur) curByCat.set(t.categoryId, (curByCat.get(t.categoryId) ?? 0) + t.amountCents);
  for (const [cid, cur] of curByCat) {
    const b = base.get(cid);
    if (!b || b.totalCents <= 0) continue;
    const monthlyAvg = b.totalCents / 3;
    if (cur >= opts.minCents && cur > opts.catMultiple * monthlyAvg) {
      const c = cid != null ? catMap.get(cid) : undefined;
      out.push({
        kind: "category",
        name: c?.name ?? "未分类",
        icon: c?.icon ?? "🏷️",
        amountCents: cur,
        baselineCents: Math.round(monthlyAvg),
      });
    }
  }
  // 超出幅度大的在前
  return out.sort((a, b) => b.amountCents / Math.max(1, b.baselineCents) - a.amountCents / Math.max(1, a.baselineCents));
}
