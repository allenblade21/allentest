import Link from "next/link";
import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { monthOf, today } from "@/lib/date";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

function dayLabel(date: string): string {
  if (date === today()) return "今天";
  const d = new Date(`${date}T00:00:00`);
  return `${date.slice(5).replace("-", "月")}日 ${WEEKDAYS[d.getDay()]}`;
}

// ① 首页/流水:月度汇总 + 按日分组流水
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

  const catMap = new Map(cats.map((c) => [c.id, c]));
  const acctMap = new Map(accts.map((a) => [a.id, a]));

  let expense = 0;
  let income = 0;
  const byDay = new Map<string, typeof rows>();
  for (const t of rows) {
    if (t.type === "expense") expense += t.amountCents;
    if (t.type === "income") income += t.amountCents;
    const list = byDay.get(t.date) ?? [];
    list.push(t);
    byDay.set(t.date, list);
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

      {/* 流水:按日分组 */}
      {rows.length === 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">
            本月还没有账目。点击下方「+」记一笔,或右上角「导入」上传账单截图批量记账。
          </p>
        </section>
      ) : (
        [...byDay.entries()].map(([date, list]) => {
          const dayExpense = list
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + t.amountCents, 0);
          return (
            <section key={date}>
              <div className="mb-1.5 flex justify-between px-1 text-xs text-neutral-500">
                <span>{dayLabel(date)}</span>
                {dayExpense > 0 && <span className="tabular-nums">支出 {formatCents(dayExpense)}</span>}
              </div>
              <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm dark:divide-neutral-800 dark:bg-neutral-900">
                {list.map((t) => {
                  const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
                  const acct = t.accountId ? acctMap.get(t.accountId) : undefined;
                  return (
                    <Link
                      key={t.id}
                      href={`/record?id=${t.id}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg dark:bg-neutral-800">
                        {t.type === "transfer" ? "🔁" : cat?.icon || "🏷️"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t.note || t.merchant || cat?.name || "转账"}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {[cat?.name, acct?.name, t.source === "ocr" ? "📎" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          t.type === "income" ? "text-emerald-700 dark:text-emerald-400" : ""
                        }`}
                      >
                        {t.type === "income"
                          ? formatCents(t.amountCents, true)
                          : t.type === "expense"
                            ? formatCents(-t.amountCents)
                            : formatCents(t.amountCents)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
