"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = { kind: "idle" } | { kind: "copied" } | { kind: "failed"; url: string };

export function CopyLinkButton({ pollId }: { pollId: string }) {
  const [state, setState] = useState<CopyState>({ kind: "idle" });
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    const url = `${window.location.origin}/polls/${pollId}`;
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(url);
      setState({ kind: "copied" });
      resetTimer.current = setTimeout(() => setState({ kind: "idle" }), 2000);
    } catch {
      // The clipboard API needs a secure context and permission; fall back to showing the link.
      setState({ kind: "failed", url });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={copy}
        className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        {state.kind === "copied" ? "복사했어요!" : "링크 복사"}
      </button>
      <p aria-live="polite" className="sr-only">
        {state.kind === "copied" ? "투표 링크를 복사했어요." : ""}
      </p>
      {state.kind === "failed" && (
        <p className="text-sm break-all text-zinc-600 dark:text-zinc-400">
          복사하지 못했어요. 이 주소를 직접 복사해 주세요: {state.url}
        </p>
      )}
    </div>
  );
}
