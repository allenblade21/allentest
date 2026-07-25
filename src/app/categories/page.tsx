import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import MetaManager from "@/components/MetaManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  return <MetaManager kind="category" rows={rows} />;
}
