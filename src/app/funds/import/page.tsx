import FundImportFlow from "@/components/FundImportFlow";
import { today } from "@/lib/date";

export const dynamic = "force-dynamic";

export default function FundImportPage() {
  return <FundImportFlow today={today()} />;
}
