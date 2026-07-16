import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, recurring, transactions } from "@/db/schema";
import { detectCandidates, type RecurringRow } from "@/lib/recurring";
import type { Tx } from "@/lib/analytics";
import { monthOf, today } from "@/lib/date";
import RecurringManager from "@/components/RecurringManager";

export const dynamic = "force-dynamic";

// P3 · 周期支出管理:登记 + 到期状态 + 记一笔顺延 + 流水候选识别
export default async function RecurringPage() {
  const [rows, cats, txs] = await Promise.all([
    db.select().from(recurring).orderBy(asc(recurring.nextDate)),
    db.select().from(categories).where(eq(categories.type, "expense")),
    db.select().from(transactions),
  ]);
  const t = today();
  const candidates = detectCandidates(
    txs as Tx[],
    rows.map((r) => r.name),
    monthOf(t),
  );

  return (
    <RecurringManager
      rows={rows as RecurringRow[]}
      candidates={candidates}
      categories={cats}
      today={t}
    />
  );
}
