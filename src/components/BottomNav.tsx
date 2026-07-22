"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "流水", icon: "📒" },
  { href: "/funds", label: "基金", icon: "📈" },
  { href: "/record", label: "记一笔", icon: "+", fab: true },
  { href: "/analysis", label: "分析", icon: "📊" },
  { href: "/me", label: "我的", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) =>
          tab.fab ? (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-neutral-500"
            >
              <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white shadow-lg">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                pathname === tab.href
                  ? "font-semibold text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-500"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
