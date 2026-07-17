import { redirect } from "next/navigation";
import { getSessionUser, registrationAllowed } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="login" registerOpen={registrationAllowed()} />;
}
