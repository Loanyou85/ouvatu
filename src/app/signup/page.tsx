import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthLayout } from "@/features/auth/auth-layout";
import { getSessionUser } from "@/services/users/auth";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <AuthLayout
      title="Crée ton espace"
      subtitle="Prêt en 20 secondes. Choisis ensuite l'offre qui te convient."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
            Se connecter
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
