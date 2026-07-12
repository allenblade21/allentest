// ④ 基金:投资总览 + 基金列表(骨架)
export default function FundsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">基金</h1>
        <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">
          ⤓ 导入持仓截图
        </button>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-xs text-neutral-500">总市值</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">¥0.00</p>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">持有收益</p>
            <p className="font-semibold tabular-nums">--</p>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">今日收益</p>
            <p className="font-semibold tabular-nums">--</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">
          还没有基金记录。导入基金 App 持仓截图,同一基金会按代码归一,自动汇总各期涨跌。
        </p>
      </section>
    </div>
  );
}
