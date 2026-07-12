import Link from "next/link";

// ② 记一笔:全屏页,不带底部导航(骨架,表单交互在下个迭代)
export default function RecordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg">
          ✕
        </Link>
        <h1 className="font-bold">记一笔</h1>
        <button className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm dark:bg-neutral-800">
          📷 OCR
        </button>
      </div>

      <div className="flex gap-2">
        {["支出", "收入", "转账"].map((t, i) => (
          <span
            key={t}
            className={`flex-1 rounded-full py-1.5 text-center text-sm ${
              i === 0
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-white text-neutral-500 dark:bg-neutral-900"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="border-b-2 border-neutral-900 py-3 text-right text-3xl font-bold tabular-nums dark:border-white">
        ¥ 0.00
      </div>

      <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm dark:bg-neutral-900">
        分类宫格 / 账户 / 日期 / 备注 / 数字键盘 —— 下个迭代接入
      </div>
    </div>
  );
}
