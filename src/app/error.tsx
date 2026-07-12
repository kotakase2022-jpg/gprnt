"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">表示中に問題が発生しました</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          内部情報を表示せず、安全に再試行できます。問題が続く場合はデモ状態をリセットしてください。
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="size-4" />
          再試行
        </Button>
      </div>
    </main>
  );
}
