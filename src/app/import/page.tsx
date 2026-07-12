import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import ImportFlow from "@/components/ImportFlow";

export const dynamic = "force-dynamic";

// ③ OCR 批量导入:上传截图 → 识别 → 待确认清单 → 入账
export default async function ImportPage() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return <ImportFlow categories={cats} />;
}
