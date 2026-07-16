// 预算:常设分类月度额度 vs 当月实际支出(纯函数)

import { categoryBreakdown, type Cat, type Tx } from "./analytics";

export type BudgetRow = { id: number; categoryId: number; limitCents: number };

export type BudgetProgress = {
  categoryId: number;
  name: string;
  icon: string | null;
  limitCents: number;
  spentCents: number;
  pct: number; // 已用百分比(可 >100)
  over: boolean; // 已超支
};

// 各预算分类的当月执行进度,按已用比例降序(最紧张的排最前)
export function budgetProgress(
  budgets: BudgetRow[],
  txs: Tx[],
  cats: Cat[],
  month: string,
): BudgetProgress[] {
  const spent = new Map(
    categoryBreakdown(txs, cats, month, "expense").map((c) => [c.categoryId, c.cents]),
  );
  const catMap = new Map(cats.map((c) => [c.id, c]));
  return budgets
    .map((b) => {
      const c = catMap.get(b.categoryId);
      const spentCents = spent.get(b.categoryId) ?? 0;
      return {
        categoryId: b.categoryId,
        name: c?.name ?? "未知分类",
        icon: c?.icon ?? "🏷️",
        limitCents: b.limitCents,
        spentCents,
        pct: b.limitCents > 0 ? (spentCents / b.limitCents) * 100 : 0,
        over: spentCents > b.limitCents,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

export function overBudget(list: BudgetProgress[]): BudgetProgress[] {
  return list.filter((b) => b.over);
}
