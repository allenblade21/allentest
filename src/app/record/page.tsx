import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import RecordForm from "@/components/RecordForm";
import type { TxType } from "@/lib/tx-validate";

export const dynamic = "force-dynamic";

// ② 记一笔 / 编辑账目:?id=123 时为编辑模式
export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [cats, accts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(accounts),
  ]);

  let initial = null;
  const numId = Number(id);
  if (id && Number.isInteger(numId) && numId > 0) {
    const [row] = await db.select().from(transactions).where(eq(transactions.id, numId));
    if (row) {
      initial = {
        id: row.id,
        type: row.type as TxType,
        amountCents: row.amountCents,
        categoryId: row.categoryId,
        accountId: row.accountId,
        date: row.date,
        note: row.note,
        merchant: row.merchant,
      };
    }
  }

  return <RecordForm categories={cats} accounts={accts} initial={initial} />;
}
