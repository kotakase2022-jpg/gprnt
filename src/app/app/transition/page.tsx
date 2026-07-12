"use client";

import * as React from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  Edit3,
  Gauge,
  Mountain,
  Save,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { roleHasPermission } from "@/domain";

const risks = [
  {
    title: "炭素価格の上昇",
    type: "移行リスク",
    likelihood: 4,
    impact: 4,
    horizon: "中期",
    business: "素材・製造",
    direction: "費用増",
    response: "省エネ設備と再エネ調達を前倒し",
    icon: TrendingUp,
  },
  {
    title: "主要工場の洪水",
    type: "物理的リスク",
    likelihood: 3,
    impact: 5,
    horizon: "短〜中期",
    business: "国内製造",
    direction: "操業損失",
    response: "BCP、止水対策、代替生産",
    icon: Mountain,
  },
  {
    title: "低炭素部材の需要拡大",
    type: "気候機会",
    likelihood: 4,
    impact: 4,
    horizon: "中期",
    business: "新素材",
    direction: "売上増",
    response: "低炭素製品ラインへ投資",
    icon: Sun,
  },
];

export default function TransitionPage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const canWrite = roleHasPermission(role, "transition:write");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const action = workspace.transitionActions.find(
    (item) => item.id === editingId,
  );
  const [draft, setDraft] = React.useState({
    title: "",
    owner: "",
    investment: "",
    targetYear: 2030,
  });

  function openEdit(id: string) {
    const selected = workspace.transitionActions.find(
      (item) => item.id === id,
    )!;
    setDraft({
      title: selected.title,
      owner: selected.owner,
      investment: selected.investment,
      targetYear: selected.targetYear,
    });
    setEditingId(id);
  }

  function saveEdit() {
    if (!editingId || !draft.title.trim() || !draft.owner.trim())
      return toast.error("施策名と責任部門を入力してください");
    workspace.updateTransitionAction(editingId, draft);
    setEditingId(null);
    toast.success("移行施策を更新しました");
  }

  const overall = Math.round(
    workspace.transitionActions.reduce((sum, item) => sum + item.progress, 0) /
      workspace.transitionActions.length,
  );
  const flow = [
    [Building2, "現状", "Scope 1+2 21,130"],
    [Mountain, "リスク・機会", "優先3件"],
    [Target, "目標", "FY2030 -40%"],
    [TrendingUp, "施策", `${workspace.transitionActions.length}件`],
    [Banknote, "投資", "CapEx 7.0億円"],
    [Gauge, "KPI", "再エネ比率 60%"],
    [CalendarClock, "進捗", `${overall}%`],
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="CLIMATE RISK & TRANSITION PLAN"
        title="リスクから投資・KPI・進捗までを一本化"
        description="物理・移行リスクと機会を評価し、目標、施策、CapEx／OpEx、責任者、取締役会の監督状況までつなぎます。"
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">移行計画ストーリー</CardTitle>
              <CardDescription>
                現状 → リスク・機会 → 目標 → 施策 → 投資 → KPI → 進捗
              </CardDescription>
            </div>
            <Badge>{overall}% 進捗</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 lg:grid-cols-7">
            {flow.map(([Icon, label, value], index) => (
              <React.Fragment key={label}>
                <div className="relative rounded-xl border bg-background p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-[18px]" />
                  </span>
                  <p className="mt-4 text-xs font-semibold">{label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {value}
                  </p>
                  {index < flow.length - 1 && (
                    <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-card text-muted-foreground lg:block" />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">気候リスク・機会</CardTitle>
            <CardDescription>
              発生可能性 × 影響度。財務影響の方向と対応策を明示
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {risks.map((risk) => {
              const Icon = risk.icon;
              return (
                <div key={risk.title} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-[18px]" />
                    </span>
                    <Badge
                      variant={risk.type === "気候機会" ? "default" : "outline"}
                    >
                      {risk.type}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{risk.title}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">可能性 / 影響</dt>
                    <dd className="text-right font-mono">
                      {risk.likelihood} / {risk.impact}
                    </dd>
                    <dt className="text-muted-foreground">時間軸</dt>
                    <dd className="text-right">{risk.horizon}</dd>
                    <dt className="text-muted-foreground">対象事業</dt>
                    <dd className="text-right">{risk.business}</dd>
                    <dt className="text-muted-foreground">財務方向</dt>
                    <dd className="text-right">{risk.direction}</dd>
                  </dl>
                  <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-5">
                    {risk.response}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GHG削減目標</CardTitle>
            <CardDescription>基準年・目標年・現在地</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs text-primary-foreground/70">
                FY2030 Scope 1+2
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold">-40%</p>
              <p className="mt-1 text-xs">FY2023 基準 / 運営支配</p>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs">
                <span>削減進捗</span>
                <span className="font-mono">31%</span>
              </div>
              <Progress value={31} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">基準値</p>
                <p className="mt-1 font-mono font-semibold">24,100 t</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">目標値</p>
                <p className="mt-1 font-mono font-semibold">14,460 t</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                移行施策ポートフォリオ
              </CardTitle>
              <CardDescription>
                責任部門、投資区分、KPI、目標年、進捗を編集できます
              </CardDescription>
            </div>
            <Badge variant="outline">取締役会: 四半期監督</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.transitionActions.map((item) => (
            <div key={item.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <Badge variant="outline">FY{item.targetYear}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    責任: {item.owner} · {item.investment} · KPI: 完了率
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    disabled={!canWrite}
                    value={String(item.progress)}
                    onValueChange={(value) => {
                      workspace.updateTransitionProgress(
                        item.id,
                        Number(value),
                      );
                      toast.success(`${item.title}の進捗を更新しました`);
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 20, 35, 42, 50, 68, 75, 90, 100].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEdit(item.id)}
                    aria-label={`${item.title}を編集`}
                    disabled={!canWrite}
                  >
                    <Edit3 className="size-4" />
                  </Button>
                </div>
              </div>
              <Progress value={item.progress} className="mt-4 h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4 border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">監督状況</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              経営会議で月次、取締役会で四半期にリスク・KPI・投資進捗を確認。直近報告:
              2026-06-25（合成デモ）
            </p>
          </div>
          <Badge>監督中</Badge>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingId)}
        onOpenChange={(open) => !open && setEditingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移行施策を編集</DialogTitle>
            <DialogDescription>
              変更内容は監査ログへ記録され、開示案とレポートへ反映されます。
            </DialogDescription>
          </DialogHeader>
          {action && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="action-title">施策名</Label>
                <Input
                  id="action-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action-owner">責任部門</Label>
                <Input
                  id="action-owner"
                  value={draft.owner}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      owner: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action-investment">CapEx / OpEx</Label>
                <Input
                  id="action-investment"
                  value={draft.investment}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      investment: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action-year">目標年</Label>
                <Input
                  id="action-year"
                  type="number"
                  min="2026"
                  max="2050"
                  value={draft.targetYear}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      targetYear: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              キャンセル
            </Button>
            <Button onClick={saveEdit}>
              <Save className="size-4" />
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
