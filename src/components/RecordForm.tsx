"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { today } from "@/lib/date";
import type { TxType } from "@/lib/tx-validate";

type Category = { id: number; name: string; type: string; icon: string | null; sortOrder: number };
type Account = { id: number; name: string };
type Initial = {
  id: number;
  type: TxType;
  amountCents: number;
  categoryId: number | null;
  accountId: number | null;
  date: string;
  note: string | null;
  merchant: string | null;
} | null;

const TYPE_LABELS: { key: TxType; label: string }[] = [
  { key: "expense", label: "支出" },
  { key: "income", label: "收入" },
  { key: "transfer", label: "转账" },
];

export default function RecordForm({
  categories,
  accounts,
  initial,
}: {
  categories: Category[];
  accounts: Account[];
  initial: Initial;
}) {
  const router = useRouter();
  const editing = initial != null;

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amountStr, setAmountStr] = useState(
    initial ? (initial.amountCents / 100).toFixed(2).replace(/\.?0+$/, "") : "",
  );
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [accountId, setAccountId] = useState<number | null>(initial?.accountId ?? null);
  const [date, setDate] = useState(initial?.date ?? today());
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const shownCategories = useMemo(
    () =>
      categories
        .filter((c) => (type === "income" ? c.type === "income" : c.type === "expense"))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories, type],
  );

  const amountCents = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [amountStr]);

  function tap(key: string) {
    setMsg("");
    if (key === "del") return setAmountStr((s) => s.slice(0, -1));
    setAmountStr((s) => {
      if (key === "." && (s.includes(".") || s === "")) return s;
      if (/\.\d{2}$/.test(s)) return s; // 最多两位小数
      if (s === "0" && key !== ".") return key; // 避免 01
      if (s.replace(/\D/g, "").length >= 9) return s; // 上限保护
      return s + key;
    });
  }

  async function save(again: boolean) {
    if (amountCents <= 0) return setMsg("请输入金额");
    if (type !== "transfer" && categoryId == null) return setMsg("请选择分类");
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/transactions/${initial!.id}` : "/api/transactions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amountCents,
          categoryId: type === "transfer" ? null : categoryId,
          accountId,
          date,
          note: note || null,
          merchant: initial?.merchant ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error ?? `保存失败(${res.status})`);
        return;
      }
      if (again) {
        setAmountStr("");
        setNote("");
        setMsg("已保存,继续记下一笔");
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || !window.confirm("确定删除这笔记录?")) return;
    setBusy(true);
    const res = await fetch(`/api/transactions/${initial!.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setMsg("删除失败");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="p-1 text-lg" aria-label="返回">✕</Link>
        <h1 className="font-bold">{editing ? "编辑账目" : "记一笔"}</h1>
        {editing ? (
          <button onClick={remove} disabled={busy} className="text-sm text-red-600">删除</button>
        ) : (
          <span className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm text-neutral-400 dark:bg-neutral-800" title="下个迭代接入">📷 OCR</span>
        )}
      </div>

      {/* 类型切换 */}
      <div className="flex gap-2">
        {TYPE_LABELS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setCategoryId(null); }}
            className={`flex-1 rounded-full py-1.5 text-sm ${
              type === t.key
                ? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900"
                : "bg-white text-neutral-500 dark:bg-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 金额 */}
      <div className="border-b-2 border-neutral-900 py-2 text-right text-3xl font-bold tabular-nums dark:border-white">
        ¥ {amountStr || <span className="text-neutral-300 dark:text-neutral-700">0.00</span>}
      </div>

      {/* 分类宫格 */}
      {type !== "transfer" && (
        <div className="grid grid-cols-4 gap-2">
          {shownCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs ${
                categoryId === c.id
                  ? "border-emerald-700 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-transparent bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              <span className="text-lg leading-none">{c.icon || "🏷️"}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 账户 / 日期 / 备注 */}
      <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl bg-white px-4 text-sm border border-neutral-200 dark:border-neutral-800 dark:divide-neutral-800 dark:bg-neutral-900">
        <label className="flex items-center justify-between py-2.5">
          <span className="text-neutral-500">账户</span>
          <select
            value={accountId ?? ""}
            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
            className="bg-transparent text-right"
          >
            <option value="">不选</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between py-2.5">
          <span className="text-neutral-500">日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-right"
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-neutral-500">备注</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="选填"
            className="flex-1 bg-transparent text-right outline-none"
          />
        </label>
      </div>

      {msg && <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>}

      {/* 键盘 + 操作 */}
      <div className="mt-auto flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <div className="grid flex-[3] grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
            <button
              key={k}
              onClick={() => tap(k)}
              className="rounded-lg bg-white py-3 text-lg font-semibold border border-neutral-200 dark:border-neutral-800 active:bg-neutral-200 dark:bg-neutral-900 dark:active:bg-neutral-700"
            >
              {k === "del" ? "⌫" : k}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {!editing && (
            <button
              onClick={() => save(true)}
              disabled={busy}
              className="flex-1 rounded-lg bg-white text-sm border border-neutral-200 dark:border-neutral-800 disabled:opacity-50 dark:bg-neutral-900"
            >
              再记一笔
            </button>
          )}
          <button
            onClick={() => save(false)}
            disabled={busy}
            className="flex-[2] rounded-lg bg-emerald-700 font-semibold text-white border border-neutral-200 dark:border-neutral-800 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
