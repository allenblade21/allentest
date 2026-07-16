import Database from "better-sqlite3";

// 直接操作测试库,用于用例间清理数据(服务端开了 WAL,可并发访问)
export function resetData() {
  const db = new Database("data/test.db");
  db.exec("delete from transactions; delete from merchant_rules; delete from budgets; delete from recurring;");
  db.close();
}

export function countRows(table: "transactions" | "merchant_rules"): number {
  const db = new Database("data/test.db");
  const n = (db.prepare(`select count(*) c from ${table}`).get() as { c: number }).c;
  db.close();
  return n;
}

// 1x1 透明 PNG,作为 OCR mock 模式的上传样例
export const FAKE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
