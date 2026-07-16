import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import BudgetForm from "@/components/BudgetForm";

export const dynamic = "force-dynamic";

// P3 · 预算设置:支出分类的月度限额
export default async function BudgetPage() {
  const [cats, rows] = await Promise.all([
    db.select().from(categories).where(eq(categories.type, "expense")).orderBy(asc(categories.sortOrder)),
    db.select().from(budgets),
  ]);
  const initial: Record<number, number> = {};
  for (const b of rows) initial[b.categoryId] = b.limitCents;

  return <BudgetForm categories={cats} initial={initial} />;
}
