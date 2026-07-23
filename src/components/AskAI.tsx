"use client";

import { useState } from "react";
import Link from "next/link";

// AI 财务问答:输入问题或点快捷问题 → /api/ai/ask
const QUICK = ["这个月花了多少钱?", "支出最多的分类是什么?", "和上个月比支出变化如何?"];

export default function AskAI() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return setErr("请输入问题");
    setBusy(true); setErr(""); setAnswer("");
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(data.error ?? "AI 服务不可用");
      setAnswer(data.answer);
    } finally {
      setBusy(false);
    }
  }

  const card = "rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-xl text-neutral-400">‹</Link>
        <h1 className="font-bold">AI 问答</h1>
      </div>
      <p className="px-1 text-xs text-neutral-500">
        用自然语言问你的账本。只发送汇总数据给模型,不外发逐笔明细。
      </p>
      <div className={`${card} flex flex-col gap-2.5`}>
        <textarea
          aria-label="问题"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例:这个月餐饮花了多少?"
          rows={2}
          className="resize-none rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-neutral-700"
        />
        <button
          onClick={() => ask(q)}
          disabled={busy}
          className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "思考中…" : "提问"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((s) => (
          <button
            key={s}
            onClick={() => { setQ(s); ask(s); }}
            disabled={busy}
            className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs dark:bg-neutral-800"
          >
            {s}
          </button>
        ))}
      </div>
      {err && <p className="px-1 text-sm text-red-600 dark:text-red-400">{err}</p>}
      {answer && (
        <div className={card}>
          <p className="text-xs text-neutral-500">回答</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
