"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { fmtPct } from "@/lib/fund";
import type { PendingFund } from "@/app/api/funds/ocr/route";

type Item = PendingFund & { checked: boolean };

export default function FundImportFlow({ today }: { today: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function pick(list: FileList | null) {
    if (!list) return;
    setFiles([...list].slice(0, 10));
    setItems(null);
    setMsg("");
  }

  async function recognize() {
    if (files.length === 0) return setMsg("请先选择截图");
    setBusy(true);
    setMsg("识别中,请稍候…");
    try {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      form.append("today", today);
      const res = await fetch("/api/funds/ocr", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? `识别失败(${res.status})`);
      const list: Item[] = (data.items as PendingFund[]).map((it) => ({
        ...it,
        checked: !it.duplicate && it.confidence === "high" && !!it.code,
      }));
      setItems(list);
      setMsg(data.errors?.length ? `部分失败:${data.errors.join(";")}` : list.length === 0 ? "没有识别到基金" : "");
    } finally {
      setBusy(false);
    }
  }

  function update(id: string, patch: Partial<Item>) {
    setItems((prev) => prev!.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function confirm() {
    const sel = items!.filter((it) => it.checked);
    if (sel.length === 0) return setMsg("请至少勾选一条");
    for (const it of sel) {
      if (!it.code || !/^\d{6}$/.test(it.code)) return setMsg(`「${it.name}」缺基金代码(6 位),请补全`);
      if (it.marketValueCents <= 0) return setMsg(`「${it.name}」市值为空,请补全`);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/funds/ocr/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sel.map((it) => ({
            fundCode: it.code, name: it.name, date: it.date,
            marketValueCents: it.marketValueCents, shares: it.shares,
            dayChangePct: it.dayChangePct, holdingProfitCents: it.holdingProfitCents,
            imagePath: it.imagePath,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "入账失败");
      router.push("/funds");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const selCount = items?.filter((it) => it.checked).length ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/funds" className="text-lg">‹</Link>
        <h1 className="font-bold">导入持仓截图</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => pick(e.target.files)} />
      <button onClick={() => fileRef.current?.click()} className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        <span className="text-xl">+</span>
        添加基金持仓截图(支付宝/天天基金/券商,最多 10 张)
      </button>

      {files.length > 0 && !items && (
        <button onClick={recognize} disabled={busy} className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "识别中…" : `开始识别(${files.length} 张)`}
        </button>
      )}
      {msg && <p className="text-center text-sm text-amber-700 dark:text-amber-400">{msg}</p>}

      {items && items.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="px-1 text-xs text-neutral-500">待确认 {items.length} 只 · 无代码/存疑/疑似重复默认不勾选</p>
          {items.map((it) => (
            <div key={it.id} className={`flex flex-col gap-2 rounded-2xl bg-white p-3 dark:bg-neutral-900 ${it.duplicate || it.confidence === "low" || !it.code ? "border border-dashed border-amber-400" : "border border-neutral-200 dark:border-neutral-800"}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={it.checked} onChange={(e) => update(it.id, { checked: e.target.checked })} className="h-4 w-4 accent-emerald-700" />
                <input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
                {it.duplicate && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">疑似重复</span>}
                {it.confidence === "low" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">存疑</span>}
                <span className={`text-sm font-semibold tabular-nums ${(it.dayChangePct ?? 0) < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmtPct(it.dayChangePct)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7 text-xs text-neutral-500">
                <input value={it.code ?? ""} onChange={(e) => update(it.id, { code: e.target.value || null })} placeholder="基金代码(6位)" className={`w-28 rounded-lg border bg-transparent px-1.5 py-1 ${!it.code ? "border-amber-400" : "border-neutral-200 dark:border-neutral-700"}`} />
                <input type="date" value={it.date} onChange={(e) => update(it.id, { date: e.target.value })} className="rounded-lg border border-neutral-200 bg-transparent px-1.5 py-1 dark:border-neutral-700" />
                <span className="tabular-nums">市值 {formatCents(it.marketValueCents)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {items && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-3 pb-[max(env(safe-area-inset-bottom),12px)] dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={() => setItems((prev) => prev!.map((it) => ({ ...it, checked: true })))} className="flex-1 rounded-xl bg-neutral-100 py-2.5 text-sm dark:bg-neutral-800">
              已选 {selCount} / {items.length}
            </button>
            <button onClick={confirm} disabled={busy || selCount === 0} className="flex-[2] rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50">
              {busy ? "入账中…" : "入账"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
