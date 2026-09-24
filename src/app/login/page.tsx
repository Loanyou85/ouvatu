import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthLayout } from "@/features/auth/auth-layout";
import { getSessionUser } from "@/services/users/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/");
  const { next } = await props.searchParams;
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
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </AuthLayout>
  );
}
