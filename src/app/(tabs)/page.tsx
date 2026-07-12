import Link from "next/link";

// ① 首页/流水:月度汇总 + 按日分组流水(骨架,数据接入在下个迭代)
export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">2026年7月</h1>
        <Link
          href="/import"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          ⤓ 导入
        </Link>
      </div>

      {/* 月度汇总卡 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-xs text-neutral-500">本月结余</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">¥0.00</p>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">支出</p>
            <p className="font-semibold tabular-nums">¥0.00</p>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">收入</p>
            <p className="font-semibold tabular-nums">¥0.00</p>
          </div>
        </div>
      </section>

      {/* 流水列表占位 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">
          还没有账目。点击下方「+」记一笔,或右上角「导入」上传账单截图批量记账。
        </p>
      </section>
    </div>
  );
}
