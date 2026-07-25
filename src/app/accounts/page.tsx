import { asc } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import MetaManager from "@/components/MetaManager";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const rows = await db.select().from(accounts).orderBy(asc(accounts.id));
  return <MetaManager kind="account" rows={rows} />;
}
