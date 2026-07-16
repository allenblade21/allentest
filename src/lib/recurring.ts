// 周期支出:到期判断、日期顺延、从流水识别候选(纯函数)

import type { Tx } from "./analytics";

export type RecurringRow = {
  id: number;
  name: string;
  amountCents: number;
  categoryId: number | null;
  cycle: "monthly" | "yearly";
  nextDate: string; // YYYY-MM-DD
};

export type DueStatus = "overdue" | "upcoming" | "later";

// 到期状态:已过期 / N 天内即将到期 / 还早
export function dueStatus(nextDate: string, today: string, withinDays = 7): DueStatus {
  if (nextDate < today) return "overdue";
  const diff = (new Date(nextDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000;
  return diff <= withinDays ? "upcoming" : "later";
}

export function dueSoon(list: RecurringRow[], today: string, withinDays = 7): RecurringRow[] {
  return list
    .filter((r) => dueStatus(r.nextDate, today, withinDays) !== "later")
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

// 顺延一个周期。月末安全:1-31 → 2-28(取目标月最后一天),记住原始日意图由调用方自行维护即可(个人场景可接受)
export function advanceDate(date: string, cycle: "monthly" | "yearly"): string {
  const [y, m, d] = date.split("-").map(Number);
  const ty = cycle === "yearly" ? y + 1 : y;
  const tm = cycle === "yearly" ? m : m + 1;
  const lastDay = new Date(ty, tm, 0).getDate(); // 目标月天数(tm 已是 1-based,Date 月参数 0-based 故恰为下月 0 日)
  const day = Math.min(d, lastDay);
  const norm = new Date(ty, tm - 1, day);
  return `${norm.getFullYear()}-${String(norm.getMonth() + 1).padStart(2, "0")}-${String(norm.getDate()).padStart(2, "0")}`;
}

export type Candidate = {
  name: string;
  amountCents: number;
  categoryId: number | null;
  lastDate: string;
  suggestedNextDate: string;
};

// 从流水识别周期支出候选:近 3 个自然月(含当月)每月都出现「同名同金额」的支出
export function detectCandidates(
  txs: Tx[],
  existingNames: string[],
  anchorMonth: string, // YYYY-MM
  extras?: { note?: (t: Tx) => string | null },
): Candidate[] {
  const months = new Set<string>();
  {
    const [y, m] = anchorMonth.split("-").map(Number);
    for (let i = 0; i < 3; i++) {
      const d = new Date(y, m - 1 - i, 1);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  }
  const getName = extras?.note ?? ((t: Tx & { note?: string | null; merchant?: string | null }) => t.note || t.merchant || null);

  type Agg = { monthsSeen: Set<string>; lastDate: string; lastTx: Tx };
  const groups = new Map<string, Agg>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const mo = t.date.slice(0, 7);
    if (!months.has(mo)) continue;
    const name = getName(t as Tx & { note?: string | null; merchant?: string | null });
    if (!name) continue;
    const key = `${name}|${t.amountCents}`;
    const g = groups.get(key) ?? { monthsSeen: new Set(), lastDate: t.date, lastTx: t };
    g.monthsSeen.add(mo);
    if (t.date > g.lastDate) {
      g.lastDate = t.date;
      g.lastTx = t;
    }
    groups.set(key, g);
  }

  const existing = new Set(existingNames);
  const out: Candidate[] = [];
  for (const [key, g] of groups) {
    if (g.monthsSeen.size < 3) continue;
    const name = key.split("|")[0];
    if (existing.has(name)) continue;
    out.push({
      name,
      amountCents: g.lastTx.amountCents,
      categoryId: g.lastTx.categoryId,
      lastDate: g.lastDate,
      suggestedNextDate: advanceDate(g.lastDate, "monthly"),
    });
  }
  return out.sort((a, b) => b.amountCents - a.amountCents);
}
