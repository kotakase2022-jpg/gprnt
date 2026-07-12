"use client";

import * as React from "react";
import Link from "next/link";
import { Calculator, FileWarning, Save, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { calculateGhgEmissions, type GhgCalculationResult } from "@/domain/ghg";
import { roleHasPermission } from "@/domain/rbac";
import type { GhgScope, Scope2Basis } from "@/domain/types";
import { demoEmissionFactors } from "@/data";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import { EmissionsTrendChart } from "@/components/features/charts";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const scope3Names = [
  "購入した製品・サービス",
  "資本財",
  "燃料・エネルギー関連",
  "上流の輸送・配送",
  "事業から出る廃棄物",
  "出張",
  "雇用者の通勤",
  "上流のリース資産",
  "下流の輸送・配送",
  "販売した製品の加工",
  "販売した製品の使用",
  "販売した製品の廃棄",
  "下流のリース資産",
  "フランチャイズ",
  "投資",
];
const coverage = [
  68, 82, 94, 46, 100, 75, 88, 100, 38, 25, 54, 62, 100, 100, 90,
];

export default function GhgPage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const canWrite = roleHasPermission(role, "metric:write");
  const [activity, setActivity] = React.useState("170000");
  const [factorId, setFactorId] = React.useState(demoEmissionFactors[0]!.id);
  const [scope, setScope] = React.useState<GhgScope>("scope_1");
  const [basis, setBasis] = React.useState<Scope2Basis>("location_based");
  const [result, setResult] = React.useState<GhgCalculationResult | null>(null);
  const factor =
    demoEmissionFactors.find((item) => item.id === factorId) ??
    demoEmissionFactors[0]!;

  function calculate() {
    try {
      const next = calculateGhgEmissions({
        activity: { value: Number(activity), unit: factor.activityUnit },
        emissionFactor: factor,
        scope,
        ...(scope === "scope_2" ? { scope2Basis: basis } : {}),
        ...(scope === "scope_3" ? { scope3Category: 1 } : {}),
        isEstimated: true,
      });
      setResult(next);
      toast.success("算定が完了しました", {
        description: `${next.emissions.value.toLocaleString()} tCO₂e（まだ保存されていません）`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "算定入力を確認してください",
      );
    }
  }

  function saveResult() {
    if (!result) return;
    workspace.addMetric({
      metricCode: `GHG-${scope.toUpperCase()}-CALC`,
      label: `${scope.replace("_", " ")} デモ算定結果`,
      category: "GHG排出",
      value: result.emissions.value.toFixed(2),
      unit: "t-CO₂e",
    });
    toast.success("算定結果と計算過程を記録しました");
  }

  return (
    <>
      <PageHeader
        eyebrow="GHG INVENTORY / SCOPE 1–3"
        title="排出量を、式と根拠まで追跡"
        description="活動量×排出係数の算定、Scope 2基準の区別、Scope 3全15カテゴリーの重要度・充足率・一次データ状況を確認します。"
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/suppliers">
              <Users className="size-4" />
              Supplier回答へ
            </Link>
          </Button>
        }
      />
      <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-950">
        <FileWarning className="size-4" />
        <AlertTitle>DEMO DATA — 正式な排出係数ではありません</AlertTitle>
        <AlertDescription>
          以下の係数は計算機能を示すための合成値です。実務・開示・保証には使用できません。
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">排出インベントリ</TabsTrigger>
          <TabsTrigger value="calculator">算定ロジック</TabsTrigger>
          <TabsTrigger value="scope3">Scope 3（15カテゴリー）</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="space-y-4">
          <section className="grid gap-4 md:grid-cols-4">
            {[
              ["Scope 1", "12,420", "t-CO₂e", "-5.5%"],
              ["Scope 2 / LB", "8,710", "t-CO₂e", "-7.9%"],
              ["Scope 2 / MB", "6,980", "t-CO₂e", "-10.4%"],
              ["Scope 3", "74,100", "t-CO₂e", "-5.7%"],
            ].map(([label, value, unit, change]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 font-mono text-2xl font-semibold">
                    {value}
                  </p>
                  <div className="mt-2 flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{unit}</span>
                    <span className="text-emerald-700">{change} YoY</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">排出推移</CardTitle>
              <CardDescription>
                基準年 FY2023 / 目標年 FY2030 / 売上高原単位 0.42 t-CO₂e/百万円
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmissionsTrendChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="size-4 text-primary" />
                  活動量 × 排出係数
                </CardTitle>
                <CardDescription>
                  計算ロジックはUIから分離した純粋関数を使用
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="ghg-scope">Scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(value) => {
                      setScope(value as GhgScope);
                      setResult(null);
                    }}
                  >
                    <SelectTrigger id="ghg-scope" aria-label="GHG Scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scope_1">Scope 1</SelectItem>
                      <SelectItem value="scope_2">Scope 2</SelectItem>
                      <SelectItem value="scope_3">
                        Scope 3 / Category 1
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scope === "scope_2" && (
                  <div className="grid gap-2">
                    <Label htmlFor="scope2-basis">算定基準</Label>
                    <Select
                      value={basis}
                      onValueChange={(value) => setBasis(value as Scope2Basis)}
                    >
                      <SelectTrigger
                        id="scope2-basis"
                        aria-label="Scope 2 算定基準"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="location_based">
                          ロケーション基準
                        </SelectItem>
                        <SelectItem value="market_based">
                          マーケット基準
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="emission-factor">排出係数</Label>
                  <Select
                    value={factorId}
                    onValueChange={(value) => {
                      setFactorId(value);
                      setResult(null);
                    }}
                  >
                    <SelectTrigger id="emission-factor" aria-label="排出係数">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {demoEmissionFactors.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="activity">
                    活動量 ({factor.activityUnit})
                  </Label>
                  <Input
                    id="activity"
                    type="number"
                    min="0"
                    value={activity}
                    onChange={(event) => setActivity(event.target.value)}
                  />
                </div>
                <Button onClick={calculate} className="w-full">
                  <Calculator className="size-4" />
                  算定する
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">算定結果・計算過程</CardTitle>
                <CardDescription>
                  係数名、年度、版、基準、推計区分を保持
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-primary p-5 text-primary-foreground">
                      <p className="text-xs text-primary-foreground/70">
                        算定排出量
                      </p>
                      <p className="mt-2 font-mono text-4xl font-semibold">
                        {result.emissions.value.toLocaleString(undefined, {
                          maximumFractionDigits: 3,
                        })}
                      </p>
                      <p className="mt-1 text-xs">t-CO₂e</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold">計算式</p>
                      <code className="mt-2 block rounded-lg bg-muted p-4 text-xs leading-5">
                        {result.formula}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">係数</p>
                        <p className="mt-1">{result.methodologyLabel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">区分</p>
                        <p className="mt-1">
                          {result.isEstimated ? "推計" : "実測"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={saveResult}
                      disabled={!canWrite}
                    >
                      <Save className="size-4" />
                      算定結果を指標データへ記録
                    </Button>
                  </div>
                ) : (
                  <div className="grid min-h-80 place-items-center rounded-lg border border-dashed text-center">
                    <div>
                      <Calculator className="mx-auto size-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">
                        入力後に算定してください
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        算定前の値は保存されません
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scope3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Scope 3 全15カテゴリー
                  </CardTitle>
                  <CardDescription>
                    重要度、データ充足率、推計/実測、Supplier回答、品質スコア
                  </CardDescription>
                </div>
                <Badge>総合充足率 67%</Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cat.</TableHead>
                    <TableHead>カテゴリー</TableHead>
                    <TableHead>重要度</TableHead>
                    <TableHead className="min-w-40">データ充足率</TableHead>
                    <TableHead>データ区分</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>品質</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scope3Names.map((name, index) => {
                    const important = [0, 1, 3, 8, 10].includes(index);
                    const primary = coverage[index]! >= 80;
                    return (
                      <TableRow key={name}>
                        <TableCell className="font-mono">{index + 1}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={important ? "default" : "outline"}>
                            {important ? "重要" : "標準"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress
                              value={coverage[index]}
                              className="h-1.5"
                            />
                            <span className="w-8 font-mono text-xs">
                              {coverage[index]}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {primary ? "実測 / 一次" : "推計"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {[0, 3, 8].includes(index)
                            ? "回答収集中"
                            : "対象外/完了"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              coverage[index]! < 50
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }
                          >
                            {Math.round(coverage[index]! * 0.88)}点
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-end">
            <Button asChild>
              <Link href="/app/suppliers">
                <Truck className="size-4" />
                一次データ収集を管理
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
