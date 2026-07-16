// 周期支出写入校验,POST / PATCH 共用(route 文件不允许导出额外函数)

/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateRecurring(b: any): string | null {
  if (typeof b?.name !== "string" || !b.name.trim()) return "名称必填";
  if (!Number.isInteger(b?.amountCents) || b.amountCents <= 0) return "金额必须是正整数(分)";
  if (b?.cycle !== "monthly" && b?.cycle !== "yearly") return "cycle 必须是 monthly/yearly";
  if (typeof b?.nextDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.nextDate)) return "nextDate 必须是 YYYY-MM-DD";
  if (b?.categoryId != null && !Number.isInteger(b.categoryId)) return "categoryId 非法";
  return null;
}
