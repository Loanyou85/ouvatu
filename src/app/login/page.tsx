import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthLayout } from "@/features/auth/auth-layout";
import { getSessionUser } from "@/services/users/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/");
  const { next, confirmed, error } = await props.searchParams;
  return (
    <AuthLayout
      title="Content de te revoir"
      subtitle="Retrouve toutes tes découvertes."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-semibold text-ink underline underline-offset-2">
            Créer un compte
          </Link>
        </>
      }
    >
      {confirmed ? (
        <p className="mb-4 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
          ✅ Ton email est confirmé. Connecte-toi pour continuer.
        </p>
      ) : null}
      {error === "link_expired" ? (
        <p className="mb-4 rounded-2xl bg-error-soft px-4 py-3 text-sm font-semibold text-error">
          Ce lien a expiré. Connecte-toi, ou recrée ton compte pour recevoir un nouvel email.
        </p>
      ) : null}
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </AuthLayout>
  );
}
