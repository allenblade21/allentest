"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { today } from "@/lib/date";
import type { PendingItem } from "@/app/api/ocr/route";

type Category = { id: number; name: string; type: string; icon: string | null };

type EditableItem = PendingItem & { checked: boolean };

export default function ImportFlow({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const arr = [...list].slice(0, 10);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
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
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? `识别失败(${res.status})`);
      const list: EditableItem[] = (data.items as PendingItem[]).map((it) => ({
        ...it,
        // 疑似重复、存疑的默认不勾选
        checked: !it.duplicate && it.confidence === "high" && it.amountCents > 0,
      }));
      setItems(list);
      setMsg(
        data.errors?.length
          ? `部分图片识别失败:${data.errors.join(";")}`
          : list.length === 0
            ? "没有识别到交易记录"
            : "",
      );
    } finally {
      setBusy(false);
    }
  }

  function update(id: string, patch: Partial<EditableItem>) {
    setItems((prev) => prev!.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function confirm() {
    const selected = items!.filter((it) => it.checked);
    if (selected.length === 0) return setMsg("请至少勾选一条记录");
    for (const it of selected) {
      if (it.amountCents <= 0) return setMsg("有勾选记录的金额为空,请先补全");
      if (!it.categoryId) return setMsg("有勾选记录没有分类,请先选择");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ocr/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((it) => ({
            type: it.type,
            amountCents: it.amountCents,
            categoryId: it.categoryId,
            accountId: null,
            date: it.date ?? today(),
            time: it.time,
            merchant: it.merchant,
            note: it.merchant,
            imagePath: it.imagePath,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "入账失败");
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = items?.filter((it) => it.checked).length ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1 text-lg" aria-label="返回">‹</Link>
        <h1 className="font-bold">导入账单</h1>
      </div>

      {/* 上传区 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => pickFiles(e.target.files)}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700"
      >
        <span className="text-xl">+</span>
        添加截图(支付宝 / 微信 / 银行 / 小票,最多 10 张)
      </button>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`截图 ${i + 1}`} className="h-16 w-16 rounded-lg border border-neutral-200 object-cover dark:border-neutral-800" />
          ))}
        </div>
      )}

      {files.length > 0 && !items && (
        <button
          onClick={recognize}
          disabled={busy}
          className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "识别中…" : `开始识别(${files.length} 张)`}
        </button>
      )}

      {msg && <p className="text-center text-sm text-amber-700 dark:text-amber-400">{msg}</p>}

      {/* 待确认清单 */}
      {items && items.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="px-1 text-xs text-neutral-500">
            待确认 {items.length} 笔 · 校对后勾选入账;「疑似重复」「存疑」默认不勾选
          </p>
          {items.map((it) => (
            <div
              key={it.id}
              className={`flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900 ${
                it.duplicate || it.confidence === "low" ? "border border-dashed border-amber-400" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={it.checked}
                  onChange={(e) => update(it.id, { checked: e.target.checked })}
                  className="h-4 w-4 accent-emerald-700"
                />
                <input
                  value={it.merchant ?? ""}
                  onChange={(e) => update(it.id, { merchant: e.target.value || null })}
                  placeholder="商户/备注"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                />
                {it.duplicate && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">疑似重复</span>
                )}
                {it.confidence === "low" && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">存疑</span>
                )}
                <span className={`text-sm font-semibold tabular-nums ${it.type === "income" ? "text-emerald-700" : ""}`}>
                  {it.amountCents > 0 ? formatCents(it.type === "expense" ? -it.amountCents : it.amountCents, it.type === "income") : "--"}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-7 text-xs text-neutral-500">
                <select
                  value={it.categoryId ?? ""}
                  onChange={(e) => update(it.id, { categoryId: e.target.value ? Number(e.target.value) : null })}
                  className="rounded-lg border border-neutral-200 bg-transparent px-1.5 py-1 dark:border-neutral-700"
                >
                  <option value="">选择分类</option>
                  {categories
                    .filter((c) => c.type === it.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                </select>
                <input
                  type="date"
                  value={it.date ?? ""}
                  onChange={(e) => update(it.id, { date: e.target.value || null })}
                  className="rounded-lg border border-neutral-200 bg-transparent px-1.5 py-1 dark:border-neutral-700"
                />
                <input
                  inputMode="decimal"
                  placeholder="金额"
                  value={it.amountCents > 0 ? (it.amountCents / 100).toString() : ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    update(it.id, { amountCents: Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0 });
                  }}
                  className="w-20 rounded-lg border border-neutral-200 bg-transparent px-1.5 py-1 text-right tabular-nums dark:border-neutral-700"
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 底部操作栏 */}
      {items && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-3 pb-[max(env(safe-area-inset-bottom),12px)] dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex max-w-md gap-2">
            <button
              onClick={() => setItems((prev) => prev!.map((it) => ({ ...it, checked: true })))}
              className="flex-1 rounded-xl bg-neutral-100 py-2.5 text-sm dark:bg-neutral-800"
            >
              已选 {selectedCount} / {items.length}
            </button>
            <button
              onClick={confirm}
              disabled={busy || selectedCount === 0}
              className="flex-[2] rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "入账中…" : "入账"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
