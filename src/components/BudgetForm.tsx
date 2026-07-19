"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Category = { id: number; name: string; icon: string | null };

// 分类月度预算设置:填元、留空/0 = 不设该分类预算
export default function BudgetForm({
  categories,
  initial, // categoryId -> limitCents
}: {
  categories: Category[];
  initial: Record<number, number>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>(() => {
    const v: Record<number, string> = {};
    for (const c of categories) {
      const cents = initial[c.id];
      v[c.id] = cents ? String(cents / 100) : "";
    }
    return v;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    const items: { categoryId: number; limitCents: number }[] = [];
    for (const c of categories) {
      const raw = values[c.id]?.trim() ?? "";
      if (raw === "") {
        items.push({ categoryId: c.id, limitCents: 0 });
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return setMsg(`「${c.name}」的预算金额不合法`);
      items.push({ categoryId: c.id, limitCents: Math.round(n * 100) });
    }
    setBusy(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "保存失败");
      setMsg("已保存");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-lg">‹</Link>
        <h1 className="font-bold">预算设置</h1>
      </div>
      <p className="px-1 text-xs text-neutral-500">
        为分类设置每月支出上限,月月生效;留空表示不设预算。超支会在首页和消费分析中提醒。
      </p>

      <div className="divide-y divide-neutral-100 rounded-2xl bg-white px-4 border border-neutral-200 dark:border-neutral-800 dark:divide-neutral-800 dark:bg-neutral-900">
        {categories.map((c) => (
          <label key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="flex items-center gap-2">
              <span>{c.icon}</span>
              {c.name}
            </span>
            <span className="flex items-center gap-1 text-neutral-500">
              ¥
              <input
                aria-label={`${c.name}预算`}
                inputMode="decimal"
                placeholder="未设置"
                value={values[c.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                className="w-28 rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-right tabular-nums outline-none dark:border-neutral-700"
              />
              /月
            </span>
          </label>
        ))}
      </div>

      {msg && (
        <p className={`text-center text-sm ${msg === "已保存" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
          {msg}
        </p>
      )}

      <button
        onClick={save}
        disabled={busy}
        className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
