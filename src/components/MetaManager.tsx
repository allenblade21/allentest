"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 分类/账户管理(共用):全宽虚线新增 + 行内改名 + 删除(使用中 409 提示)
export type MetaRow = { id: number; name: string; icon?: string | null; type?: string };

export default function MetaManager({
  kind,
  rows,
}: {
  kind: "category" | "account";
  rows: MetaRow[];
}) {
  const router = useRouter();
  const isCat = kind === "category";
  const api = isCat ? "/api/categories" : "/api/accounts";
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true); setMsg("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error ?? "操作失败");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!name.trim()) return setMsg("请填名称");
    const ok = await call(api, "POST", isCat ? { name, icon: icon || undefined, type } : { name });
    if (ok) { setShowForm(false); setName(""); setIcon(""); }
  }
  async function rename(id: number) {
    if (!editName.trim()) return setMsg("请填名称");
    const ok = await call(`${api}/${id}`, "PATCH", { name: editName });
    if (ok) setEditId(null);
  }
  async function remove(id: number, n: string) {
    if (!window.confirm(`删除「${n}」?`)) return;
    await call(`${api}/${id}`, "DELETE");
  }

  const input = "rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-neutral-700";
  const title = isCat ? "分类管理" : "账户管理";
  const expense = rows.filter((r) => r.type === "expense");
  const income = rows.filter((r) => r.type === "income");
  const groups = isCat ? [["支出分类", expense], ["收入分类", income]] as const : [["账户", rows]] as const;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/me" className="text-xl text-neutral-400">‹</Link>
        <h1 className="font-bold">{title}</h1>
      </div>
      <p className="px-1 text-xs text-neutral-500">
        {isCat ? "被流水/预算/周期支出引用的分类不能删除;改名会同步到全部历史记录。" : "有流水引用的账户不能删除;改名同步全部历史。"}
      </p>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-neutral-300 py-3 font-medium text-emerald-700 dark:border-neutral-700 dark:text-emerald-400"
        >
          ＋ 新增{isCat ? "分类" : "账户"}
        </button>
      )}
      {showForm && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-white p-4 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex gap-2">
            <input aria-label={`${title}名称`} value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className={`${input} flex-1`} />
            {isCat && (
              <input aria-label="图标" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="图标 emoji" className={`${input} w-28`} />
            )}
          </div>
          {isCat && (
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium ${type === t ? "bg-emerald-700 text-white" : "bg-neutral-100 dark:bg-neutral-800"}`}>
                  {t === "expense" ? "支出" : "收入"}
                </button>
              ))}
            </div>
          )}
          <button onClick={add} disabled={busy} className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50">保存</button>
        </div>
      )}
      {msg && <p className="px-1 text-sm text-red-600 dark:text-red-400">{msg}</p>}

      {groups.map(([label, list]) => (
        <section key={label}>
          <p className="mb-2 px-1 text-xs text-neutral-500">{label} · {list.length}</p>
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                {isCat && <span className="text-lg">{r.icon || "🏷️"}</span>}
                {editId === r.id ? (
                  <>
                    <input aria-label="新名称" value={editName} onChange={(e) => setEditName(e.target.value)} className={`${input} flex-1`} autoFocus />
                    <button onClick={() => rename(r.id)} disabled={busy} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white">保存</button>
                    <button onClick={() => setEditId(null)} className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs dark:bg-neutral-800">取消</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{r.name}</span>
                    <button onClick={() => { setEditId(r.id); setEditName(r.name); }} aria-label={`改名${r.name}`} className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs dark:bg-neutral-800">改名</button>
                    <button onClick={() => remove(r.id, r.name)} disabled={busy} className="p-1 text-neutral-400 hover:text-red-600" aria-label={`删除${r.name}`}>✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
