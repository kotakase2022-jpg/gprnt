"use client";

import * as React from "react";
import { Database, KeyRound, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import { PageHeader } from "@/components/layout/page-header";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { role, companyId, resetDemo } = useDemoSession();
  const workspace = useDemoWorkspace();
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  function saveSettings() {
    const at = new Date().toISOString();
    window.localStorage.setItem(
      "terrast-demo-settings-v1",
      JSON.stringify({
        companyId,
        sharingConsent: workspace.sharingConsent,
        savedAt: at,
      }),
    );
    setSavedAt(at);
    toast.success("設定をブラウザへ保存しました");
  }

  function resetAll() {
    workspace.resetWorkspace();
    resetDemo();
    window.localStorage.removeItem("terrast-demo-settings-v1");
    window.localStorage.removeItem("terrast-marketplace-saved");
    setSavedAt(null);
    toast.success("デモ状態を初期値へ戻しました");
  }
  return (
    <>
      <PageHeader
        eyebrow="DEMO SETTINGS / GOVERNANCE"
        title="デモ設定・データ共有同意"
        description="Repository、Connector、AIの動作モードと、運営者へ共有する範囲を確認・変更します。"
        actions={
          <Button variant="outline" onClick={saveSettings}>
            <Save className="size-4" />
            設定を保存
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-primary" />
              実行モード
            </CardTitle>
            <CardDescription>
              環境変数が未設定でも主要操作が動作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Repository</p>
                <p className="text-xs text-muted-foreground">
                  ブラウザlocalStorageへ保存
                </p>
              </div>
              <Badge>DemoRepository</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">TERRAST Connector</p>
                <p className="text-xs text-muted-foreground">
                  合成デモレコード
                </p>
              </div>
              <Badge>mock</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">AI</p>
                <p className="text-xs text-muted-foreground">
                  APIキー・model未設定時
                </p>
              </div>
              <Badge variant="outline">deterministic demo</Badge>
            </div>
            <Separator />
            <p className="text-xs leading-5 text-muted-foreground">
              Supabase設定時はAuthを実行し、スキーマadapter確定後にSupabaseRepositoryへ切替。TERRAST実APIは仕様確定まで接続しません。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-primary" />
              プラットフォーム共有同意
            </CardTitle>
            <CardDescription>Company Adminが共有範囲を管理</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                checked={workspace.sharingConsent}
                onCheckedChange={(checked) =>
                  workspace.setSharingConsent(Boolean(checked))
                }
                disabled={role !== "company_admin" && role !== "system_admin"}
              />
              <span>
                <span className="block text-sm font-medium">
                  匿名集計と同意済み個社サマリーを共有
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  準備度、GHG集計、移行計画進捗。証憑本文、レビューコメント、個人情報は共有しません。
                </span>
              </span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-muted-foreground">対象企業</p>
                <p className="mt-1 font-mono">{companyId}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-muted-foreground">現在のロール</p>
                <p className="mt-1 font-mono">{role}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              同意の付与・取消は監査ログに記録されます。
            </p>
            {savedAt && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                最終保存: {new Date(savedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              秘密情報と認証
            </CardTitle>
            <CardDescription>クライアントへ露出しない設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Supabase Service Role</Label>
              <Input
                value="サーバー環境変数のみ（未設定）"
                readOnly
                className="mt-2"
              />
            </div>
            <div>
              <Label>OpenAI API Key</Label>
              <Input
                value="サーバー環境変数のみ（未設定）"
                readOnly
                className="mt-2"
              />
            </div>
            <div>
              <Label>TERRAST API Key</Label>
              <Input
                value="サーバー環境変数のみ（未設定）"
                readOnly
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base">デモ状態の初期化</CardTitle>
            <CardDescription>
              同期、入力、AI、レビュー、Supplier、移行施策を初期状態へ戻す
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <RotateCcw className="size-4" />
                  デモデータをリセット
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    デモ状態をリセットしますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    このブラウザに保存された操作履歴を削除し、合成seedへ戻します。この操作は元に戻せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAll}>
                    リセット
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
