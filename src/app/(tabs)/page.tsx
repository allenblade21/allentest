import Link from "next/link";
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { monthOf, today } from "@/lib/date";
import TransactionList from "@/components/TransactionList";

export const dynamic = "force-dynamic";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

// ① 首页/流水:月度汇总 + 按日分组流水(列表部分支持多选批量操作)
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : monthOf(today());

  const [rows, cats, accts] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(like(transactions.date, `${month}-%`))
      .orderBy(desc(transactions.date), desc(transactions.id)),
    db.select().from(categories),
    db.select().from(accounts),
  ]);

  let expense = 0;
  let income = 0;
  for (const t of rows) {
    if (t.type === "expense") expense += t.amountCents;
    if (t.type === "income") income += t.amountCents;
  }

  const [year, mon] = month.split("-");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Link href={`/?month=${shiftMonth(month, -1)}`} className="px-1 text-neutral-400">‹</Link>
          {year}年{Number(mon)}月
          <Link href={`/?month=${shiftMonth(month, 1)}`} className="px-1 text-neutral-400">›</Link>
        </h1>
        <Link
          href="/import"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          ⤓ 导入
        </Link>
      </div>

      {/* 月度汇总卡 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-xs text-neutral-500">本月结余</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {formatCents(income - expense, true)}
        </p>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">支出</p>
            <p className="font-semibold tabular-nums">{formatCents(expense)}</p>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">收入</p>
            <p className="font-semibold tabular-nums">{formatCents(income)}</p>
          </div>
        </div>
      </section>

      <TransactionList rows={rows} categories={cats} accounts={accts} />
    </div>
  );
}
