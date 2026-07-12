import Link from "next/link";

// ③ OCR 批量导入:上传截图 → 待确认清单(骨架,识别流程在下个迭代)
export default function ImportPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-lg">
          ‹
        </Link>
        <h1 className="font-bold">导入账单</h1>
      </div>

      <div className="flex min-h-32 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        + 添加截图(支付宝 / 微信 / 银行 / 基金)
      </div>

      <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm dark:bg-neutral-900">
        识别后在这里显示待确认清单:逐笔校对、疑似重复标记、全选入账。
      </div>
    </div>
  );
}
