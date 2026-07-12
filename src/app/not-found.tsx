import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted">
          <SearchX className="size-6 text-muted-foreground" />
        </span>
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          404 / NOT FOUND
        </p>
        <h1 className="mt-2 text-2xl font-bold">ページが見つかりません</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          URLを確認するか、デモのトップ画面から操作を再開してください。
        </p>
        <Button className="mt-6" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            トップへ戻る
          </Link>
        </Button>
      </div>
    </main>
  );
}
