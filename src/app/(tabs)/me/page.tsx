import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

// ⑥ 我的/设置
type Item = { label: string; hint?: string; href?: string };
const groups: { title: string; items: Item[] }[] = [
  {
    title: "分析与预算",
    items: [
      { label: "消费分析", hint: "环比 · 趋势 · 分类结构", href: "/analysis" },
      { label: "预算设置", hint: "分类月度限额 · 超支提醒", href: "/budget" },
      { label: "周期支出", hint: "订阅/房租 · 到期提醒", href: "/recurring" },
    ],
  },
  {
    title: "数据管理",
    items: [
      { label: "分类管理" },
      { label: "账户管理" },
      { label: "导出 CSV(流水 / 基金)" },
      { label: "OCR 原图保留期限", hint: "90天" },
    ],
  },
  {
    title: "推荐功能(后续版本)",
    items: [
      { label: "净资产 / 月度报告", hint: "敬请期待" },
      { label: "异常支出提醒", hint: "敬请期待" },
    ],
  },
];

export default async function MePage() {
  const user = await getSessionUser();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">我的</h1>
        {user && <span className="text-sm text-neutral-500">👤 {user.username}</span>}
      </div>
      {groups.map((g) => (
        <section key={g.title}>
          <p className="mb-2 px-1 text-xs text-neutral-500">{g.title}</p>
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white border border-neutral-200 dark:border-neutral-800 dark:divide-neutral-800 dark:bg-neutral-900">
            {g.items.map((item) => {
              const inner = (
                <>
                  <span>{item.label}</span>
                  <span className="text-neutral-400">{item.hint ?? ""} ›</span>
                </>
              );
              return item.href ? (
                <Link key={item.label} href={item.href} className="flex items-center justify-between px-4 py-3 text-sm">
                  {inner}
                </Link>
              ) : (
                <div key={item.label} className="flex items-center justify-between px-4 py-3 text-sm">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <LogoutButton />
    </div>
  );
}
