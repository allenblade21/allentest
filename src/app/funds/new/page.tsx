import FundRecordForm from "@/components/FundRecordForm";
import { today } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function FundNewPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; name?: string }>;
}) {
  const { code, name } = await searchParams;
  return <FundRecordForm today={today()} initialCode={code ?? ""} initialName={name ?? ""} />;
}
