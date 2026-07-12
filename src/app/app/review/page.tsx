"use client";

import * as React from "react";
import {
  CheckCircle2,
  MessageSquarePlus,
  RotateCcw,
  Send,
  ShieldCheck,
  Undo2,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { roleHasPermission } from "@/domain";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const steps = [
  "Data Available",
  "Drafted",
  "In Review",
  "Revision Requested",
  "Approved",
];
const statusStep = {
  not_started: 0,
  data_available: 0,
  drafted: 1,
  in_review: 2,
  revision_requested: 3,
  approved: 4,
} as const;

export default function ReviewPage() {
  const { role, setRole } = useDemoSession();
  const workspace = useDemoWorkspace();
  const [comment, setComment] = React.useState("");
  const [assignee, setAssignee] = React.useState("佐藤 美咲（作成者）");
  const [revisionReason, setRevisionReason] = React.useState(
    "Scope 3 Cat.4の推計範囲と一次データ比率を追記してください。",
  );
  const [revokeReason, setRevokeReason] = React.useState("");
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const reviewer = roleHasPermission(role, "disclosure:review");
  const canEdit = roleHasPermission(role, "disclosure:write");
  const step = statusStep[workspace.disclosure.status];

  function addComment() {
    if (!comment.trim()) return toast.error("コメントを入力してください");
    workspace.addComment(`@${assignee} ${comment}`);
    setComment("");
    toast.success("コメントを追加しました");
  }

  function requestRevision() {
    try {
      workspace.requestRevision(revisionReason);
      setRevisionOpen(false);
      toast.success("作成者へ差戻しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "差戻しできませんでした",
      );
    }
  }

  function approve() {
    workspace.approveDisclosure();
    toast.success("開示案を承認しました", {
      description: "承認者・時刻・対象版を監査ログへ記録しました。",
    });
  }

  function revoke() {
    try {
      workspace.cancelApproval(revokeReason);
      setRevokeReason("");
      toast.success("承認を取り消し、修正依頼へ戻しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "理由を入力してください",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="REVIEW / APPROVAL / AUDIT TRAIL"
        title="レビュー・差戻し・承認"
        description="コメント、担当指定、前後差分、差戻し理由、承認・取消を版と監査ログに結びつけます。"
        actions={
          !reviewer ? (
            <Button
              variant="outline"
              onClick={() => setRole("reviewer_approver")}
            >
              <UserRoundCheck className="size-4" />
              Reviewerへ切替
            </Button>
          ) : undefined
        }
      />

      {!reviewer && (
        <Alert className="mb-4">
          <ShieldCheck className="size-4" />
          <AlertTitle>現在のロールはレビュー操作不可</AlertTitle>
          <AlertDescription>
            閲覧とコメント下書きはできます。差戻し・承認には Reviewer / Approver
            ロールへ切り替えてください。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">SSBJ-CLIMATE-DEMO-07</Badge>
                <Badge>
                  {workspace.disclosure.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <CardTitle className="mt-3 text-base">
                Scope 1・2・3排出量と算定範囲の説明
              </CardTitle>
              <CardDescription className="mt-1">
                版 3 · 担当 佐藤 美咲 · Reviewer 田中 健
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {workspace.disclosure.status !== "approved" && (
                <>
                  <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={
                          !reviewer ||
                          workspace.disclosure.status !== "in_review"
                        }
                      >
                        <RotateCcw className="size-4" />
                        差戻し
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>修正を依頼</DialogTitle>
                        <DialogDescription>
                          差戻し理由は必須で、対象版と一緒に監査ログへ記録します。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="revision-reason">差戻し理由</Label>
                        <Textarea
                          id="revision-reason"
                          rows={5}
                          className="mt-2"
                          value={revisionReason}
                          onChange={(event) =>
                            setRevisionReason(event.target.value)
                          }
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRevisionOpen(false)}
                        >
                          キャンセル
                        </Button>
                        <Button onClick={requestRevision}>差戻しを確定</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={approve}
                    disabled={
                      !reviewer || workspace.disclosure.status !== "in_review"
                    }
                  >
                    <CheckCircle2 className="size-4" />
                    承認
                  </Button>
                </>
              )}
              {workspace.disclosure.status === "approved" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!reviewer}>
                      <Undo2 className="size-4" />
                      承認取消
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        承認を取り消しますか？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        開示案はRevision
                        Requestedへ戻り、取消理由と実行者が監査ログへ記録されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                      <Label htmlFor="revoke-reason">取消理由</Label>
                      <Input
                        id="revoke-reason"
                        className="mt-2"
                        value={revokeReason}
                        onChange={(event) =>
                          setRevokeReason(event.target.value)
                        }
                        placeholder="必須"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={revoke}>
                        承認を取り消す
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {steps.map((label, index) => (
              <div key={label} className="text-center">
                <div
                  className={`mx-auto grid size-8 place-items-center rounded-full border text-xs ${index <= step ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                >
                  {index < step ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">前後差分</CardTitle>
            <CardDescription>
              前版（v2）と現在版（v3）。数値・単位・対象期間を強調
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-red-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-800">
                    v2 / 変更前
                  </p>
                  <Badge variant="outline">Drafted</Badge>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  当社はScope 1および2の排出量を算定しました。Scope
                  3については算定を進めています。
                </p>
              </div>
              <div className="rounded-xl border bg-emerald-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-800">
                    v3 / 現在
                  </p>
                  <Badge>In Review</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {workspace.disclosure.draft}
                </p>
              </div>
            </div>
            <Separator className="my-5" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Scope 1", "12,420 t-CO₂e", "追加"],
                ["Scope 2 LB", "8,710 t-CO₂e", "追加"],
                ["対象期間", "FY2025", "明確化"],
              ].map(([label, value, change]) => (
                <div key={label} className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-xs font-semibold">
                    {value}
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {change}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">コメント</CardTitle>
              <CardDescription>担当者指定・メンション相当</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workspace.disclosure.comments.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="text-xs leading-5">{item.body}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {item.author} ·{" "}
                      {new Date(item.at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                ))}
                {workspace.disclosure.comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    この版へのコメントはまだありません。
                  </p>
                )}
              </div>
              <Separator className="my-4" />
              <Label htmlFor="assignee">担当者</Label>
              <Input
                id="assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className="mt-2"
              />
              <Label htmlFor="review-comment" className="mt-3 block">
                レビューコメント
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="根拠や修正内容を具体的に記載"
                rows={4}
                className="mt-2"
              />
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={addComment}
              >
                <MessageSquarePlus className="size-4" />
                コメントを追加
              </Button>
            </CardContent>
          </Card>
          {workspace.disclosure.revisionReason && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-900">
                  直近の差戻し理由
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-amber-900">
                  {workspace.disclosure.revisionReason}
                </p>
                {workspace.disclosure.status === "revision_requested" &&
                  canEdit && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        workspace.saveDraft(workspace.disclosure.draft);
                        toast.success("修正版をDraftedへ戻しました");
                      }}
                    >
                      <Send className="size-4" />
                      修正を開始
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
