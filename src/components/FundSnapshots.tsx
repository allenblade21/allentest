"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { fmtPct } from "@/lib/fund";

type Point = {
  id: number;
  date: string;
  marketValueCents: number;
  dayChangePct: number | null;
  periodChangePct: number | null;
  holdingProfitCents: number | null;
};

// 历史快照表(倒序显示)+ 删除单条
export default function FundSnapshots({ points }: { points: Point[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const desc = [...points].reverse();

  async function remove(id: number) {
    if (!window.confirm("删除这一期快照?")) return;
    setBusy(true);
    const res = await fetch(`/api/funds/records/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("删除失败");
  }

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm dark:bg-neutral-900">
      <div className="mb-2 px-1 text-xs text-neutral-500">历史快照 · {points.length} 条</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="text-neutral-500">
              <th className="p-1.5 text-left font-medium">日期</th>
              <th className="p-1.5 text-right font-medium">市值</th>
              <th className="p-1.5 text-right font-medium">当日</th>
              <th className="p-1.5 text-right font-medium">较上期</th>
              <th className="p-1.5 text-right font-medium">持有收益</th>
              <th className="p-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {desc.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="p-1.5">{p.date.slice(5)}</td>
                <td className="p-1.5 text-right">{formatCents(p.marketValueCents)}</td>
                <td className={`p-1.5 text-right ${(p.dayChangePct ?? 0) < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmtPct(p.dayChangePct)}</td>
                <td className={`p-1.5 text-right ${(p.periodChangePct ?? 0) < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmtPct(p.periodChangePct)}</td>
                <td className="p-1.5 text-right">{p.holdingProfitCents != null ? formatCents(p.holdingProfitCents, true) : "—"}</td>
                <td className="p-1.5 text-right">
                  <button onClick={() => remove(p.id)} disabled={busy} className="text-neutral-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
