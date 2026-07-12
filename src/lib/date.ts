// 日期统一 YYYY-MM-DD 字符串(本地时区)

export function today(): string {
  return toDateString(new Date());
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}
