import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { LoginForm } from "./login-form";

export default async function OperatorLoginPage() {
  if (await isOperator()) redirect("/operator");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">운영자 로그인</h1>
      <LoginForm />
    </main>
  );
}
