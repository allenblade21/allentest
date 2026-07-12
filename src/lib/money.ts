// 金额以整数「分」存储,这里做展示与解析

export function formatCents(cents: number, withSign = false): string {
  const sign = cents < 0 ? "-" : withSign ? "+" : "";
  const abs = Math.abs(cents);
  const yuan = Math.floor(abs / 100);
  const fen = abs % 100;
  return `${sign}¥${yuan.toLocaleString("zh-CN")}.${fen.toString().padStart(2, "0")}`;
}

export function parseYuanToCents(input: string): number | null {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
