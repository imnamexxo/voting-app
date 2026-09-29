import { redirect } from "next/navigation";
import { isOperator } from "@/lib/operator";
import { signOutAction } from "./actions";

export default async function OperatorPage() {
  if (!(await isOperator())) redirect("/operator/login");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">운영자</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">운영자로 로그인했어요.</p>
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          로그아웃
        </button>
      </form>
    </main>
  );
}
