import Link from "next/link";
import type { ReactNode } from "react";

// 单行提醒条(页面架构 §二.1):首页提醒统一走本组件,新提醒 = 新增一个数据项,不改布局
const TONES = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
} as const;

export type AlertTone = keyof typeof TONES;

export default function AlertStrip({
  href,
  tone,
  icon,
  children,
}: {
  href: string;
  tone: AlertTone;
  icon: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${TONES[tone]}`}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
      <span className="ml-auto opacity-60">›</span>
    </Link>
  );
}
