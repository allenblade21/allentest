// 流水写入的字段校验,POST / PATCH 共用
export const TX_TYPES = ["expense", "income", "transfer"] as const;
export type TxType = (typeof TX_TYPES)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateTx(body: any): string | null {
  if (!body || typeof body !== "object") return "请求体不是合法 JSON";
  if (!TX_TYPES.includes(body.type)) return "type 必须是 expense/income/transfer";
  if (!Number.isInteger(body.amountCents) || body.amountCents <= 0)
    return "amountCents 必须是正整数(单位:分)";
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    return "date 必须是 YYYY-MM-DD";
  if (body.type !== "transfer" && body.categoryId == null) return "支出/收入必须选择分类";
  return null;
}
