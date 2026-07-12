"use client";

import * as React from "react";
import {
  BadgeCheck,
  Bookmark,
  BookOpen,
  Building2,
  GraduationCap,
  HandCoins,
  Leaf,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { matchMarketplaceOfferings } from "@/domain/marketplace";
import type { MarketplaceCategory } from "@/domain/types";
import { demoMarketplaceOfferings } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const categoryLabels: Record<MarketplaceCategory, string> = {
  decarbonization: "脱炭素",
  disclosure_support: "開示支援",
  assurance: "第三者保証",
  education: "教育",
  green_finance: "グリーンファイナンス",
  subsidy_support: "補助制度",
};
const icons: Record<MarketplaceCategory, typeof Leaf> = {
  decarbonization: Leaf,
  disclosure_support: BookOpen,
  assurance: ShieldCheck,
  education: GraduationCap,
  green_finance: HandCoins,
  subsidy_support: Building2,
};

export default function MarketplacePage() {
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [saved, setSaved] = React.useState<string[]>([]);
  const [showSaved, setShowSaved] = React.useState(false);
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setSaved(
          JSON.parse(
            window.localStorage.getItem("terrast-marketplace-saved") ?? "[]",
          ) as string[],
        );
      } catch {
        /* keep empty */
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const matches = matchMarketplaceOfferings(
    {
      industry: "manufacturing",
      hotspots: ["scope_1", "scope_2", "scope_3", "disclosure", "transition"],
      gapCodes: [
        "SUPPLIER_DATA",
        "SCOPE3_COVERAGE",
        "EVIDENCE",
        "TRANSITION_CAPEX",
      ],
      transitionActionKeywords: ["再エネ", "Supplier", "設備"],
    },
    demoMarketplaceOfferings,
  ).filter(
    (match) =>
      (category === "all" || match.offering.category === category) &&
      `${match.offering.name} ${match.offering.description}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!showSaved || saved.includes(match.offering.id)),
  );

  function toggleSave(id: string) {
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      window.localStorage.setItem(
        "terrast-marketplace-saved",
        JSON.stringify(next),
      );
      return next;
    });
    toast.success(
      saved.includes(id)
        ? "検討リストから外しました"
        : "検討リストへ保存しました",
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="SOLUTION / FINANCE MARKETPLACE"
        title="開示ギャップと移行施策から、次の支援を探す"
        description="業種、排出ホットスポット、開示ギャップ、移行施策を使った決定論的ルールで、架空のデモサービスだけを推奨します。"
        actions={
          <Button
            variant={showSaved ? "default" : "outline"}
            onClick={() => setShowSaved((value) => !value)}
          >
            <Bookmark className="size-4" />
            検討中 {saved.length}
          </Button>
        }
      />
      <Alert className="mb-4">
        <BadgeCheck className="size-4" />
        <AlertTitle>架空サービス / 条件・保証の提示なし</AlertTitle>
        <AlertDescription>
          実在企業・実在金融商品ではありません。提供条件、採択、保証、資金調達の可否を示すものではありません。
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="支援テーマを検索"
                className="pl-9"
              />
            </div>
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="all">すべて</TabsTrigger>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <TabsTrigger key={value} value={value}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">推奨に使用:</span>
            <Badge variant="outline">製造業</Badge>
            <Badge variant="outline">Scope 3不足</Badge>
            <Badge variant="outline">証憑整備</Badge>
            <Badge variant="outline">移行CapEx</Badge>
          </div>
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((match, index) => {
          const Icon = icons[match.offering.category];
          const isSaved = saved.includes(match.offering.id);
          return (
            <Card key={match.offering.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="text-right">
                    <Badge variant={index < 2 ? "default" : "outline"}>
                      {index + 1}位
                    </Badge>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      MATCH {match.score}
                    </p>
                  </div>
                </div>
                <CardTitle className="mt-4 text-base">
                  {match.offering.name}
                </CardTitle>
                <CardDescription>
                  {match.offering.providerName} ·{" "}
                  {categoryLabels[match.offering.category]}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm leading-6 text-muted-foreground">
                  {match.offering.description}
                </p>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs">
                    <span>推奨適合度</span>
                    <span className="font-mono">{match.score}/100</span>
                  </div>
                  <Progress value={match.score} />
                </div>
                <div className="mt-4 space-y-2">
                  {match.reasons.slice(0, 3).map((reason) => (
                    <div
                      key={reason}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Sparkles className="size-3.5 text-primary" />
                      <span>
                        {reason
                          .replace("Industry fit", "業種に適合")
                          .replace(
                            "Addresses scope 3",
                            "Scope 3ホットスポットに対応",
                          )
                          .replace("Addresses disclosure", "開示ギャップに対応")
                          .replace("Addresses transition", "移行施策に対応")
                          .replace("Supports gap", "不足項目:")}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-lg bg-muted p-3 text-[10px] leading-4 text-muted-foreground">
                  {match.offering.termsDisclaimer}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isSaved ? "secondary" : "outline"}
                  onClick={() => toggleSave(match.offering.id)}
                >
                  <Bookmark
                    className={`size-4 ${isSaved ? "fill-current" : ""}`}
                  />
                  {isSaved ? "検討リスト保存済み" : "検討リストへ保存"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </section>
    </>
  );
}
