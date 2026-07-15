import Link from "next/link";

// ⑥ 我的/设置
type Item = { label: string; hint?: string; href?: string };
const groups: { title: string; items: Item[] }[] = [
  {
    title: "分析",
    items: [{ label: "消费分析", hint: "环比 · 趋势 · 分类结构", href: "/analysis" }],
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
      { label: "预算建议 / 超支提醒", hint: "敬请期待" },
      { label: "异常支出 / 订阅提醒", hint: "敬请期待" },
    ],
  },
];

export default function MePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">我的</h1>
      {groups.map((g) => (
        <section key={g.title}>
          <p className="mb-2 px-1 text-xs text-neutral-500">{g.title}</p>
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm dark:divide-neutral-800 dark:bg-neutral-900">
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
    </div>
  );
}
