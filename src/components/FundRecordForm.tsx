"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 手动记 / 补录一期基金快照
export default function FundRecordForm({
  today,
  initialCode = "",
  initialName = "",
}: {
  today: string;
  initialCode?: string;
  initialName?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const [date, setDate] = useState(today);
  const [marketYuan, setMarketYuan] = useState("");
  const [shares, setShares] = useState("");
  const [dayChange, setDayChange] = useState("");
  const [holdingYuan, setHoldingYuan] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    if (!/^\d{6}$/.test(code)) return setMsg("基金代码必须是 6 位数字");
    if (!name.trim()) return setMsg("请填基金名称");
    const market = Math.round(Number(marketYuan) * 100);
    if (!Number.isFinite(market) || market <= 0) return setMsg("请填市值");
    setBusy(true);
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, name, date,
          marketValueCents: market,
          shares: shares ? Number(shares) : null,
          dayChangePct: dayChange ? Number(dayChange) : null,
          holdingProfitCents: holdingYuan ? Math.round(Number(holdingYuan) * 100) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "保存失败");
      router.push(`/funds/${code}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const field = "flex items-center justify-between gap-3 py-2.5 border-t border-neutral-100 dark:border-neutral-800 text-sm";
  const input = "flex-1 bg-transparent text-right outline-none";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/funds" className="text-lg">✕</Link>
        <h1 className="font-bold">{initialCode ? "补录 / 修正快照" : "手动记一笔基金"}</h1>
      </div>

      <div className="rounded-2xl bg-white px-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={field.replace("border-t border-neutral-100 dark:border-neutral-800", "")}>
          <span className="text-neutral-500">基金代码</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 位数字" inputMode="numeric" readOnly={!!initialCode} className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">基金名称</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 华夏沪深300ETF联接A" className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">市值(元)</span>
          <input value={marketYuan} onChange={(e) => setMarketYuan(e.target.value)} placeholder="必填" inputMode="decimal" className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">份额</span>
          <input value={shares} onChange={(e) => setShares(e.target.value)} placeholder="选填" inputMode="decimal" className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">当日涨跌(%)</span>
          <input value={dayChange} onChange={(e) => setDayChange(e.target.value)} placeholder="如 0.42 或 -2.1" inputMode="decimal" className={input} />
        </label>
        <label className={field}>
          <span className="text-neutral-500">持有收益(元)</span>
          <input value={holdingYuan} onChange={(e) => setHoldingYuan(e.target.value)} placeholder="选填,亏损为负" inputMode="decimal" className={input} />
        </label>
      </div>

      {msg && <p className="text-center text-sm text-amber-700 dark:text-amber-400">{msg}</p>}
      {initialCode && <p className="px-1 text-xs text-neutral-500">同一基金同一天再记会覆盖原快照(用于修正)。</p>}

      <button onClick={save} disabled={busy} className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50">
        {busy ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
