"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { today } from "@/lib/date";

type Tx = {
  id: number;
  type: "expense" | "income" | "transfer";
  amountCents: number;
  categoryId: number | null;
  accountId: number | null;
  date: string;
  time: string | null;
  merchant: string | null;
  note: string | null;
  source: "manual" | "ocr";
  imagePath: string | null;
  createdAt: string;
};
type Category = { id: number; name: string; type: string; icon: string | null };
type Account = { id: number; name: string };

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function dayLabel(date: string): string {
  if (date === today()) return "今天";
  const d = new Date(`${date}T00:00:00`);
  return `${date.slice(5).replace("-", "月")}日 ${WEEKDAYS[d.getDay()]}`;
}

type Picker = "category" | "account" | "date" | null;

export default function TransactionList({
  rows,
  categories,
  accounts,
}: {
  rows: Tx[];
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerValue, setPickerValue] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; undoRows: Tx[] } | null>(null);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  const byDay = new Map<string, Tx[]>();
  for (const t of rows) {
    const list = byDay.get(t.date) ?? [];
    list.push(t);
    byDay.set(t.date, list);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
    setPicker(null);
  }

  async function runBatch(action: "category" | "account" | "date" | "delete", value?: unknown) {
    if (selected.size === 0) return;
    if (action === "delete" && !window.confirm(`确定删除选中的 ${selected.size} 条记录?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [...selected], value }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error ?? "操作失败");
      const verb = { category: "改分类", account: "改账户", date: "改日期", delete: "删除" }[action];
      setToast({ text: `已${verb} ${data.affected} 条`, undoRows: data.before });
      setTimeout(() => setToast(null), 8000);
      exitSelect();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!toast) return;
    setBusy(true);
    try {
      const res = await fetch("/api/transactions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toast.undoRows }),
      });
      if (res.ok) {
        setToast(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  // 空状态也要渲染撤销 toast(批量删空后仍可一键恢复)
  if (rows.length === 0) {
    return (
      <>
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">
            本月还没有账目。点击下方「+」记一笔,或右上角「导入」上传账单截图批量记账。
          </p>
        </section>
        {toast && (
          <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
            <div className="flex items-center gap-4 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-neutral-700">
              {toast.text}
              <button onClick={undo} disabled={busy} className="font-semibold text-emerald-400">撤销</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 多选模式开关 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-neutral-500">共 {rows.length} 笔</span>
        {selectMode ? (
          <span className="flex gap-3 text-xs">
            <button
              onClick={() =>
                setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((t) => t.id)))
              }
              className="text-emerald-700 dark:text-emerald-400"
            >
              {selected.size === rows.length ? "取消全选" : "全选"}
            </button>
            <button onClick={exitSelect} className="text-neutral-500">完成</button>
          </span>
        ) : (
          <button onClick={() => setSelectMode(true)} className="text-xs text-emerald-700 dark:text-emerald-400">
            编辑
          </button>
        )}
      </div>

      {/* 按日分组列表 */}
      {[...byDay.entries()].map(([date, list]) => {
        const dayExpense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amountCents, 0);
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
                const inner = (
                  <>
                    {selectMode && (
                      <input
                        type="checkbox"
                        readOnly
                        checked={selected.has(t.id)}
                        className="h-4 w-4 accent-emerald-700"
                      />
                    )}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg dark:bg-neutral-800">
                      {t.type === "transfer" ? "🔁" : cat?.icon || "🏷️"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {t.note || t.merchant || cat?.name || "转账"}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {[cat?.name, acct?.name, t.source === "ocr" ? "📎" : null].filter(Boolean).join(" · ")}
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
                  </>
                );
                return selectMode ? (
                  <button key={t.id} onClick={() => toggle(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    {inner}
                  </button>
                ) : (
                  <Link key={t.id} href={`/record?id=${t.id}`} className="flex items-center gap-3 px-4 py-3">
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* 批量操作栏(多选模式) */}
      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white p-3 pb-[max(env(safe-area-inset-bottom),12px)] dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {/* 内联选择器 */}
            {picker && (
              <div className="flex items-center gap-2">
                {picker === "date" ? (
                  <input
                    type="date"
                    value={pickerValue}
                    onChange={(e) => setPickerValue(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
                  />
                ) : (
                  <select
                    value={pickerValue}
                    onChange={(e) => setPickerValue(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
                  >
                    <option value="">请选择{picker === "category" ? "分类" : "账户"}</option>
                    {picker === "category"
                      ? categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))
                      : accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                  </select>
                )}
                <button
                  disabled={busy || !pickerValue}
                  onClick={() =>
                    runBatch(picker, picker === "date" ? pickerValue : Number(pickerValue))
                  }
                  className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  应用
                </button>
                <button onClick={() => setPicker(null)} className="px-2 text-sm text-neutral-500">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-neutral-500">已选 {selected.size} 条</span>
              <span className="flex flex-1 justify-end gap-2">
                {(["category", "account", "date"] as const).map((p) => (
                  <button
                    key={p}
                    disabled={selected.size === 0}
                    onClick={() => { setPicker(p); setPickerValue(""); }}
                    className="rounded-lg bg-neutral-100 px-3 py-1.5 disabled:opacity-40 dark:bg-neutral-800"
                  >
                    {{ category: "改分类", account: "改账户", date: "改日期" }[p]}
                  </button>
                ))}
                <button
                  disabled={selected.size === 0 || busy}
                  onClick={() => runBatch("delete")}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
                >
                  删除
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 撤销 toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-neutral-700">
            {toast.text}
            <button onClick={undo} disabled={busy} className="font-semibold text-emerald-400">撤销</button>
          </div>
        </div>
      )}
    </div>
  );
}
