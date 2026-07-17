import { redirect } from "next/navigation";
import { getSessionUser, registrationAllowed } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");
  if (!registrationAllowed()) redirect("/login");
  return <AuthForm mode="register" registerOpen />;
}
