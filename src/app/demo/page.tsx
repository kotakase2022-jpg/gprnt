import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { SupabaseSignInForm } from "@/components/auth/supabase-sign-in-form";
import { Brand } from "@/components/brand";
import { ConceptNotice } from "@/components/concept-notice";
import { RoleSelector } from "@/components/demo/role-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPublicRuntimeMode } from "@/lib/auth/runtime";

export const metadata = { title: "ログイン" };

export default function DemoLoginPage() {
  const runtimeMode = getPublicRuntimeMode();
  const isDemo = runtimeMode === "demo";

  return (
    <main id="main-content" className="min-h-screen bg-muted/35">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex items-center justify-between">
          <Brand />
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              トップへ戻る
            </Link>
          </Button>
        </div>
        <section className="mx-auto max-w-5xl py-12">
          <div className="mb-10 max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-widest text-primary">
              DEMO ACCESS
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              {isDemo
                ? "役割を選んで、実務フローを体験。"
                : "認証済みアカウントでログイン。"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isDemo
                ? "認証情報は不要です。各ロールの権限範囲に合わせて、企業データの同期、作成、レビュー、匿名集計を確認できます。操作内容はこのブラウザにのみ保存されます。"
                : "Supabase Authで本人確認を行い、管理者がapp_metadataに設定したロールを表示と操作権限へ反映します。"}
            </p>
            <ConceptNotice className="mt-4" />
          </div>
          {runtimeMode === "demo" ? (
            <RoleSelector />
          ) : runtimeMode === "supabase" ? (
            <SupabaseSignInForm />
          ) : (
            <Alert variant="destructive" className="max-w-xl">
              <AlertTriangle className="size-4" />
              <AlertTitle>認証設定が完了していません</AlertTitle>
              <AlertDescription>
                管理者に連絡してください。Demo
                Modeを無効にした環境では、Supabaseの公開URLとpublishable
                keyが必要です。
              </AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </main>
  );
}
