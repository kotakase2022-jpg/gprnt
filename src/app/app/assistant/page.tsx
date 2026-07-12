"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  FileQuestion,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { AiDisclosureOutput } from "@/lib/ai/schema";
import { useAppAuth } from "@/components/auth/auth-guard";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildAuthenticatedJsonHeaders } from "@/lib/auth/request-headers";

type ApiResult = {
  output: AiDisclosureOutput;
  meta: {
    mode: "demo" | "api";
    model: string;
    promptVersion: string;
    inputHash: string;
    executedBy: string;
    executedAt: string;
  };
};

const tasks = [
  "TERRASTデータから開示案を作成",
  "不足情報を質問化",
  "数値・単位・期間の不整合を検出",
  "気候リスク・機会候補を提示",
  "移行計画の説明案を作成",
  "前年差を要約",
  "根拠の弱い文章を警告",
];

export default function AssistantPage() {
  const { role, companyId } = useDemoSession();
  const auth = useAppAuth();
  const workspace = useDemoWorkspace();
  const [selectedTasks, setSelectedTasks] = React.useState(tasks);
  const [result, setResult] = React.useState<ApiResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const permitted = ["system_admin", "company_admin", "preparer"].includes(
    role,
  );
  const runtimeReady = auth.mode === "demo";

  async function generate() {
    if (!permitted) return toast.error("このロールにはAI生成権限がありません");
    if (auth.mode !== "demo")
      return toast.error(
        "Supabaseデータアダプター接続後にAI生成を利用できます。",
      );
    setLoading(true);
    try {
      const response = await fetch("/api/ai/disclosure", {
        method: "POST",
        headers: buildAuthenticatedJsonHeaders({
          mode: auth.mode,
          role,
          accessToken: auth.accessToken,
        }),
        body: JSON.stringify({
          companyId,
          requirementId: workspace.disclosure.requirementId,
          requirementSummary: "Scope 1・2・3排出量と算定範囲を説明する。",
          sourceData: workspace.metrics.slice(0, 8).map((metric) => ({
            id: metric.id,
            label: metric.label,
            value: metric.value,
            unit: metric.unit,
            period: metric.period,
            confidence: metric.confidence,
            organizationalBoundary: "国内外連結 / 運営支配",
          })),
          priorYearData: [
            {
              id: "metric-prior-scope-1-fy2024",
              label: "Scope 1 排出量",
              value: "13,140",
              unit: "t-CO₂e",
              period: "FY2024",
              confidence: 88,
              organizationalBoundary: "国内外連結 / 運営支配",
            },
            {
              id: "metric-prior-scope-2-fy2024",
              label: "Scope 2（ロケーション基準）",
              value: "9,180",
              unit: "t-CO₂e",
              period: "FY2024",
              confidence: 90,
              organizationalBoundary: "国内外連結 / 運営支配",
            },
          ],
          evidenceIds: workspace.metrics
            .filter((metric) => metric.verification !== "Pending")
            .slice(0, 5)
            .map((metric) => `evidence-${metric.id}`),
          requestedTasks: selectedTasks,
          priorYearText:
            "前年度はScope 1・2を中心に説明し、Scope 3は算定準備中としていました。",
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "生成回数の上限に達しました。1分後に再試行してください。"
            : "AI生成を完了できませんでした。再試行してください。",
        );
      const payload = (await response.json()) as ApiResult;
      setResult(payload);
      toast.success(
        payload.meta.mode === "api"
          ? "OpenAI APIで提案を生成しました"
          : "決定論的デモ提案を生成しました",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI生成に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }

  function applyDraft() {
    if (!result?.output.disclosureDraft) return;
    workspace.applyAiDraft(
      result.output.disclosureDraft.text,
      result.output.disclosureDraft.evidenceDataIds,
      {
        model: result.meta.model,
        inputHash: result.meta.inputHash,
        mode: result.meta.mode,
        promptVersion: result.meta.promptVersion,
      },
    );
    toast.success("開示ワークスペースへ反映しました", {
      description:
        "ステータスをDraftedに更新し、生成メタデータを監査ログへ記録しました。",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="AI DISCLOSURE ASSISTANT"
        title="根拠からだけ、開示案を組み立てる"
        description="登録データと証憑IDを根拠に、文案・不足質問・不整合・リスク候補・移行計画案・前年差をstructured outputで返します。"
        actions={
          <Button
            onClick={generate}
            disabled={loading || !permitted || !runtimeReady}
          >
            <Sparkles className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "根拠を検証中..." : "提案を生成"}
          </Button>
        }
      />

      {!runtimeReady && (
        <Alert className="mb-4" variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>本番データアダプター未接続</AlertTitle>
          <AlertDescription>
            認証は有効ですが、企業・要求事項・根拠IDを取得するSupabase
            Repositoryが未接続のため、AI生成はfail-closedです。
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-950">
        <ShieldAlert className="size-4" />
        <AlertTitle>AI提案・要レビュー</AlertTitle>
        <AlertDescription>
          AIは適合性・保証を断定しません。入力にない事実は生成せず、根拠不足時は
          insufficient_evidence
          を返します。送信対象は選択された合成データの最小DTOだけです。
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">実行する分析</CardTitle>
              <CardDescription>
                {selectedTasks.length}/{tasks.length}機能を選択
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task) => (
                <label key={task} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={selectedTasks.includes(task)}
                    onCheckedChange={(checked) =>
                      setSelectedTasks((current) =>
                        checked
                          ? [...current, task]
                          : current.filter((item) => item !== task),
                      )
                    }
                  />
                  <span>{task}</span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-primary" />
                送信対象
              </CardTitle>
              <CardDescription>
                秘密情報・証憑本文は送信しません
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">指標値</span>
                <span>{Math.min(8, workspace.metrics.length)}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">証憑ID</span>
                <span>
                  {
                    workspace.metrics
                      .filter((metric) => metric.verification !== "Pending")
                      .slice(0, 5).length
                  }
                  件
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">前年度文面</span>
                <span>1件</span>
              </div>
              <div className="rounded-lg bg-muted p-3 leading-5 text-muted-foreground">
                送信前に組織固有・個人・機密情報を除外する本番用ポリシーが必要です。
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Structured output</CardTitle>
                <CardDescription>
                  Zod validation済みの提案と根拠
                </CardDescription>
              </div>
              {result && (
                <div className="flex gap-2">
                  <Badge variant="outline">{result.meta.mode}</Badge>
                  <Badge>{result.meta.model}</Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid min-h-[420px] place-items-center">
                <div className="w-full max-w-md text-center">
                  <Bot className="mx-auto size-9 animate-pulse text-primary" />
                  <p className="mt-4 text-sm font-medium">
                    入力事実と証憑IDを検証しています
                  </p>
                  <Progress value={68} className="mt-4" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    事実生成を防ぐため、根拠のない主張を除外中
                  </p>
                </div>
              </div>
            ) : result ? (
              <Tabs defaultValue="draft">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="draft">文案</TabsTrigger>
                  <TabsTrigger value="questions">不足</TabsTrigger>
                  <TabsTrigger value="risks">リスク</TabsTrigger>
                  <TabsTrigger value="trace">監査</TabsTrigger>
                </TabsList>
                <TabsContent value="draft" className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Badge>{result.output.label}</Badge>
                      <Badge variant="outline">{result.output.status}</Badge>
                    </div>
                    {result.output.disclosureDraft ? (
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {result.output.disclosureDraft.text}
                      </p>
                    ) : (
                      <div className="text-sm text-amber-800">
                        {result.output.insufficientEvidence?.reason}
                      </div>
                    )}
                  </div>
                  {result.output.disclosureDraft && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        根拠:{" "}
                        {result.output.disclosureDraft.evidenceDataIds.join(
                          ", ",
                        )}
                      </div>
                      <Button onClick={applyDraft}>
                        <Save className="size-4" />
                        開示案へ反映
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="questions" className="space-y-3">
                  {result.output.missingQuestions.map((item, index) => (
                    <div
                      key={`${item.relatedRequirementId}-${index}`}
                      className="flex gap-3 rounded-lg border p-4"
                    >
                      <FileQuestion className="mt-0.5 size-5 shrink-0 text-amber-700" />
                      <div>
                        <p className="text-sm font-medium">{item.question}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          必要根拠: {item.requiredEvidence}
                        </p>
                      </div>
                    </div>
                  ))}
                  {result.output.weakEvidenceWarnings.map((item, index) => (
                    <div
                      key={`${item.claim}-${index}`}
                      className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                    >
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                      <div>
                        <p className="text-sm font-medium">{item.claim}</p>
                        <p className="mt-1 text-xs text-amber-800">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="risks" className="space-y-3">
                  {result.output.climateCandidates.map((item) => (
                    <div key={item.title} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <Badge variant="outline">
                          確信度 {item.confidence}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {item.rationale}
                      </p>
                      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                        根拠: {item.evidenceDataIds.join(", ")}
                      </p>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="trace">
                  <dl className="grid gap-4 rounded-lg border p-5 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        prompt_version
                      </dt>
                      <dd className="mt-1 font-mono">
                        {result.meta.promptVersion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        model / mode
                      </dt>
                      <dd className="mt-1 font-mono">
                        {result.meta.model} / {result.meta.mode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        input_hash
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs">
                        {result.meta.inputHash}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        executed_at
                      </dt>
                      <dd className="mt-1 font-mono text-xs">
                        {result.meta.executedAt}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-xs text-muted-foreground">
                        validation
                      </dt>
                      <dd className="mt-2 flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="size-4" />
                        Zod schema validation passed / reviewRequired=true
                      </dd>
                    </div>
                  </dl>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed">
                <div className="max-w-sm text-center">
                  <Bot className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-4 text-sm font-semibold">
                    根拠付き提案を生成
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    APIキー未設定でも同じZod
                    schemaを通る決定論的デモ出力で動作します。
                  </p>
                  <Button
                    className="mt-5"
                    onClick={generate}
                    disabled={!permitted || !runtimeReady}
                  >
                    <Sparkles className="size-4" />
                    提案を生成
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
