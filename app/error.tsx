"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">문제가 생겼어요</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침해 주세요.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 rounded-md bg-foreground px-4 py-2 font-medium text-background"
      >
        다시 시도
      </button>
    </main>
  );
}
