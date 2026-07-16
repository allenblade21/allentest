"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { dueStatus, type Candidate, type RecurringRow } from "@/lib/recurring";

type Category = { id: number; name: string; icon: string | null };

const CYCLE_LABEL = { monthly: "每月", yearly: "每年" } as const;

export default function RecurringManager({
  rows,
  candidates,
  categories,
  today,
}: {
  rows: RecurringRow[];
  candidates: Candidate[];
  categories: Category[];
  today: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amountYuan, setAmountYuan] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [nextDate, setNextDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function create(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "保存失败");
      setShowForm(false);
      setName(""); setAmountYuan(""); setCategoryId(""); setMsg("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitForm() {
    const cents = Math.round(Number(amountYuan) * 100);
    if (!name.trim()) return setMsg("请填名称");
    if (!Number.isFinite(cents) || cents <= 0) return setMsg("请填金额");
    await create({
      name, amountCents: cents,
      categoryId: categoryId ? Number(categoryId) : null,
      cycle, nextDate,
    });
  }

  async function adopt(c: Candidate) {
    await create({
      name: c.name, amountCents: c.amountCents, categoryId: c.categoryId,
      cycle: "monthly", nextDate: c.suggestedNextDate,
    });
  }

  async function pay(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/recurring/${id}/pay`, { method: "POST" });
      if (res.ok) router.refresh();
      else setMsg("记账失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("删除这条周期支出?(不影响已记的流水)")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-neutral-700";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-lg">‹</Link>
        <h1 className="font-bold">周期支出</h1>
        <button onClick={() => setShowForm((v) => !v)} className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">
          {showForm ? "收起" : "+ 新增"}
        </button>
      </div>
      <p className="px-1 text-xs text-neutral-500">
        登记订阅、房租等固定支出;到期前 7 天会在首页提醒,「记一笔」自动入账并顺延到下一期。
      </p>

      {/* 新增表单 */}
      {showForm && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <input aria-label="周期支出名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="名称,如 房租 / 视频会员" className={input} />
          <div className="flex gap-2">
            <input aria-label="周期支出金额" value={amountYuan} onChange={(e) => setAmountYuan(e.target.value)} placeholder="金额(元)" inputMode="decimal" className={`${input} flex-1`} />
            <select aria-label="周期" value={cycle} onChange={(e) => setCycle(e.target.value as "monthly" | "yearly")} className={input}>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
          </div>
          <div className="flex gap-2">
            <select aria-label="分类" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${input} flex-1`}>
              <option value="">不选分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input aria-label="下次日期" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={input} />
          </div>
          <button onClick={submitForm} disabled={busy} className="rounded-xl bg-emerald-700 py-2 font-semibold text-white disabled:opacity-50">保存</button>
        </div>
      )}
      {msg && <p className="text-center text-sm text-amber-700 dark:text-amber-400">{msg}</p>}

      {/* 已登记列表 */}
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm dark:bg-neutral-900">
          还没有登记周期支出。点右上「+ 新增」,或从下方流水中发现的候选一键添加。
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm dark:divide-neutral-800 dark:bg-neutral-900">
          {rows.map((r) => {
            const st = dueStatus(r.nextDate, today);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {r.name}
                    {st === "overdue" && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">已到期</span>}
                    {st === "upcoming" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">即将到期</span>}
                  </span>
                  <span className="block text-xs text-neutral-500 tabular-nums">
                    {formatCents(r.amountCents)} · {CYCLE_LABEL[r.cycle]} · 下次 {r.nextDate}
                  </span>
                </span>
                <button onClick={() => pay(r.id)} disabled={busy} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                  记一笔
                </button>
                <button onClick={() => remove(r.id)} disabled={busy} className="p-1 text-neutral-400 hover:text-red-600">✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 从流水识别的候选 */}
      {candidates.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-xs text-neutral-500">从流水中发现的疑似周期支出(近 3 个月每月出现、同名同金额)</p>
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm dark:divide-neutral-800 dark:bg-neutral-900">
            {candidates.map((c) => (
              <div key={c.name + c.amountCents} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block text-xs text-neutral-500 tabular-nums">
                    {formatCents(c.amountCents)}/月 · 上次 {c.lastDate}
                  </span>
                </span>
                <button onClick={() => adopt(c)} disabled={busy} className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-medium dark:bg-neutral-800">
                  + 添加
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
