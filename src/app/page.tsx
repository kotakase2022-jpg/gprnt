import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  DatabaseZap,
  FileCheck2,
  Handshake,
  Landmark,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const workflow = [
  "TERRAST同期",
  "自動入力",
  "不足特定",
  "証憑収集",
  "開示案作成",
  "レビュー・承認",
  "移行計画",
  "レポート出力",
  "匿名集計",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Brand />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#workflow">業務フロー</Link>
            </Button>
            <Button asChild>
              <Link href="/demo">
                デモを開始 <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,oklch(0.9_0.07_175/.65),transparent_35%),linear-gradient(to_bottom,white,oklch(0.97_0.01_220))]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24">
            <div className="self-center">
              <Badge
                className="mb-6 border-primary/20 bg-primary/8 text-primary"
                variant="outline"
              >
                <Sparkles className="mr-1 size-3.5" />
                TERRASTデータを、開示実務の出発点へ
              </Badge>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-[3.6rem]">
                集め直さない。
                <br />
                <span className="text-primary">不足だけを補い、</span>
                <br />
                開示までつなぐ。
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                企業内に分散するサステナビリティデータを、TERRAST由来の既存値で初期入力。SSBJ／ISSB開示、Scope
                3、移行計画、レビュー、集計までを一つの来歴で結びます。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/demo?mode=company">
                    上場会社デモを開始 <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/app/operator?role=platform_operator_demo_admin">
                    プラットフォーム運営者デモを開始{" "}
                    <Network className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative self-center rounded-2xl border bg-card p-4 shadow-2xl shadow-primary/10 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">日本未来製造株式会社</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    FY2025 · DEMO-1001
                  </p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700">
                  同期済み 42項目
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["開示準備度", "78%", "+12pt"],
                  ["TERRAST入力", "42", "自動取得"],
                  ["要補完", "11", "担当割当済"],
                ].map(([label, value, sub]) => (
                  <Card key={label} className="shadow-none">
                    <CardContent className="p-4">
                      <p className="text-[11px] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-2 font-mono text-2xl font-semibold">
                        {value}
                      </p>
                      <p className="mt-1 text-[10px] text-primary">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 rounded-xl border bg-muted/35 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    データから開示までの来歴
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    TRACE: DEMO-8F31
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    [DatabaseZap, "TERRAST 同期", "42項目を初期入力", "完了"],
                    [FileCheck2, "SSBJ 気候関連", "不足11項目を特定", "対応中"],
                    [
                      ShieldCheck,
                      "レビュー・承認",
                      "3件がレビュー待ち",
                      "次の工程",
                    ],
                  ].map(([Icon, title, description, status], index) => {
                    const TraceIcon = Icon as typeof DatabaseZap;
                    return (
                      <div
                        key={title as string}
                        className="flex items-center gap-3"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                          <TraceIcon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">
                            {title as string}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {description as string}
                          </p>
                        </div>
                        <Badge
                          variant={index === 0 ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {status as string}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <Badge variant="outline">WHY NOW</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                同じデータを、
                <br />
                毎年集め直す構造を変える。
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                環境、財務、IR、人事、調達。部署ごとの表計算と証憑を、共通のデータ来歴と責任分担に変換します。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [Building2, "分散", "複数部署・年度に散在し、同じ数値を再収集"],
                [
                  Users,
                  "不足が不明",
                  "基準要求とデータの対応が見えず、着手が遅れる",
                ],
                [
                  ShieldCheck,
                  "根拠が追えない",
                  "手動値、証憑、AI文案の変更理由が分断",
                ],
              ].map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof Building2;
                return (
                  <Card key={title as string}>
                    <CardContent className="p-6">
                      <ItemIcon className="size-6 text-primary" />
                      <h3 className="mt-5 font-semibold">{title as string}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {body as string}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y bg-card">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="outline">ONE CONTINUOUS WORKFLOW</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                データを受け取り、説明責任までつなぐ。
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                各工程の担当、根拠、更新履歴を切らさず、企業とプラットフォーム運営者の双方へ必要な視点を届けます。
              </p>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {workflow.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-lg border bg-background p-4"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="text-center">
            <Badge variant="outline">SHARED VALUE</Badge>
            <h2 className="mt-4 text-3xl font-bold">
              一つの基盤、異なる価値。
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [
                Building2,
                "上場会社",
                "入力負荷を抑え、不足・担当・期限を明確化",
              ],
              [Landmark, "市場運営者", "匿名集計で市場全体の進捗と障壁を把握"],
              [BarChart3, "投資家", "比較可能性とデータ来歴のある情報へ接続"],
              [Handshake, "金融機関", "移行施策・投資・KPIを資金対話へ活用"],
            ].map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof Building2;
              return (
                <Card key={title as string} className="shadow-none">
                  <CardContent className="p-6">
                    <ItemIcon className="size-6 text-primary" />
                    <h3 className="mt-4 font-semibold">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {body as string}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-xs text-primary">
                      <Check className="size-3.5" />
                      役割に応じた閲覧制御
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 md:flex-row md:items-center lg:px-8">
            <div>
              <p className="text-sm font-medium text-primary-foreground/70">
                INTERACTIVE CONCEPT MVP
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                TERRASTから始まる開示実務を体験する。
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/75">
                合成データのみを使用。同期差分、開示案、Scope
                3、レビュー、集計まで操作できます。
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/demo">
                7つのロールでデモ開始 <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Brand />
          </div>
          <Separator className="my-6" />
          <p className="text-xs text-muted-foreground">
            © 2026 TERRAST Sustainability Disclosure Hub — Synthetic demo data
            only.
          </p>
        </div>
      </footer>
    </div>
  );
}
