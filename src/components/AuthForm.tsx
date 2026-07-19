"use client";

import { useState } from "react";
import Link from "next/link";

// 登录 / 注册共用表单
export default function AuthForm({ mode, registerOpen }: { mode: "login" | "register"; registerOpen: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error ?? "操作失败");
      // 登录态由 HttpOnly cookie 承载,整页跳转让服务端重新渲染
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  const input =
    "rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-neutral-700";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <div className="text-center">
        <p className="text-4xl">📒</p>
        <h1 className="mt-2 text-xl font-bold">记账本</h1>
        <p className="mt-1 text-sm text-neutral-500">{isLogin ? "登录后继续记账" : "创建你的账号"}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900">
        <input
          aria-label="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          autoComplete="username"
          className={input}
        />
        <input
          aria-label="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isLogin ? "密码" : "密码(至少 6 位)"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
          className={input}
        />
        {msg && <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-emerald-700 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {isLogin ? "登录" : "注册"}
        </button>
      </div>

      <p className="text-center text-sm text-neutral-500">
        {isLogin ? (
          registerOpen ? (
            <>
              还没有账号?<Link href="/register" className="font-medium text-emerald-700 dark:text-emerald-400">去注册</Link>
            </>
          ) : (
            "注册已关闭"
          )
        ) : (
          <>
            已有账号?<Link href="/login" className="font-medium text-emerald-700 dark:text-emerald-400">去登录</Link>
          </>
        )}
      </p>
    </div>
  );
}
