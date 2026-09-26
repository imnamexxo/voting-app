import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">투표를 찾을 수 없어요</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        링크가 잘못되었거나 없는 투표예요.
      </p>
      <Link href="/" className="mt-8 inline-block underline">
        새 투표 만들기
      </Link>
    </main>
  );
}
