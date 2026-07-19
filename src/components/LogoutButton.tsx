"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-red-600 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-red-400">
      退出登录
    </button>
  );
}
