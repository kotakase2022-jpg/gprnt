"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clipboard,
  FileUp,
  Link2,
  MailPlus,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { roleHasPermission } from "@/domain";

const suppliers = [
  ["青空部品デモ株式会社", "Cat.1", "提出済み", "78"],
  ["北斗物流デモ株式会社", "Cat.4", "回答中", "—"],
  ["未来素材デモ株式会社", "Cat.1", "差戻し", "64"],
  ["東都包装デモ株式会社", "Cat.5", "受領", "91"],
  ["さくら商事デモ株式会社", "Cat.1", "未回答", "—"],
];

export default function SuppliersPage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const [dueDate, setDueDate] = React.useState(workspace.supplier.dueDate);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("requests");
  const [selectedSupplier, setSelectedSupplier] =
    React.useState("青空部品デモ株式会社");
  const [evidenceName, setEvidenceName] = React.useState<string | null>(null);
  const [supplierValue, setSupplierValue] = React.useState("1250");
  const [isEstimated, setIsEstimated] = React.useState(true);
  const inviteUrl = `/app/suppliers?invite=${workspace.supplier.inviteId}&role=supplier_user`;
  const responseRate = Math.round(
    (workspace.supplier.responses / workspace.supplier.requests) * 100,
  );
  const supplierView = role === "supplier_user";
  const canManage = roleHasPermission(role, "supplier_request:manage");

  async function copyInvite() {
    await navigator.clipboard.writeText(
      new URL(inviteUrl, window.location.origin).toString(),
    );
    toast.success("招待URLをコピーしました");
  }

  function sendRequest() {
    workspace.sendSupplierRequest(dueDate);
    setRequestOpen(false);
    toast.success("24社への依頼を作成しました", {
      description: "実メールは送信せず、招待URLを生成しました。",
    });
  }

  function submitResponse() {
    if (!supplierValue || !evidenceName)
      return toast.error("値と証憑ファイルを登録してください");
    workspace.submitSupplierResponse();
    toast.success("Supplier回答を提出しました");
  }

  return (
    <>
      <PageHeader
        eyebrow="SUPPLIER ENGAGEMENT / SCOPE 3"
        title={
          supplierView ? "Supplier回答ポータル" : "サプライヤー一次データ収集"
        }
        description={
          supplierView
            ? "招待されたScope 3指標だけに回答し、根拠ファイルを添付して提出します。"
            : "依頼作成、期限、招待URL、回答、証憑、差戻し、受領を一つの進捗として管理します。"
        }
        actions={
          !supplierView && canManage ? (
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
              <DialogTrigger asChild>
                <Button>
                  <MailPlus className="size-4" />
                  依頼を作成
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supplier回答依頼を作成</DialogTitle>
                  <DialogDescription>
                    対象は架空のデモSupplierです。実メールは送信されません。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>対象指標</Label>
                    <div className="mt-2 space-y-2 rounded-lg border p-3">
                      {[
                        "Scope 3 Cat.1 排出量",
                        "Scope 3 Cat.4 上流輸送",
                        "一次データ比率",
                      ].map((item) => (
                        <label
                          key={item}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox defaultChecked />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplier-due">回答期限</Label>
                    <Input
                      id="supplier-due"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRequestOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={sendRequest}>招待URLを生成</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {supplierView ? (
        <SupplierResponseForm
          value={supplierValue}
          setValue={setSupplierValue}
          evidenceName={evidenceName}
          setEvidenceName={setEvidenceName}
          isEstimated={isEstimated}
          setIsEstimated={setIsEstimated}
          status={workspace.supplier.status}
          canSubmit={["sent", "revision_requested"].includes(
            workspace.supplier.status,
          )}
          onSubmit={submitResponse}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">依頼先</p>
                <p className="mt-2 font-mono text-3xl font-semibold">
                  {workspace.supplier.requests}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  主要Supplier / 架空データ
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">回答率</p>
                <p className="mt-2 font-mono text-3xl font-semibold">
                  {responseRate}%
                </p>
                <Progress value={responseRate} className="mt-3 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">回答期限</p>
                <p className="mt-2 font-mono text-xl font-semibold">
                  {workspace.supplier.dueDate}
                </p>
                <p className="mt-2 text-[11px] text-amber-700">期限まで50日</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">
                  現在のワークフロー
                </p>
                <Badge className="mt-3">{workspace.supplier.status}</Badge>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  提出・差戻し・受領を監査
                </p>
              </CardContent>
            </Card>
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="requests">依頼・回答一覧</TabsTrigger>
              <TabsTrigger value="invite" disabled={!canManage}>
                招待リンク
              </TabsTrigger>
              <TabsTrigger value="review">回答レビュー</TabsTrigger>
            </TabsList>
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supplier回答状況</CardTitle>
                  <CardDescription>
                    回答期限 {workspace.supplier.dueDate} · 回答済み{" "}
                    {workspace.supplier.responses}/{workspace.supplier.requests}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>対象</TableHead>
                        <TableHead>状態</TableHead>
                        <TableHead>品質</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map(([name, category, status, quality]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{category}</Badge>
                          </TableCell>
                          <TableCell>{status}</TableCell>
                          <TableCell>
                            {quality === "—" ? "—" : `${quality}点`}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSupplier(name);
                                setActiveTab("review");
                              }}
                            >
                              詳細
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invite">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="size-4 text-primary" />
                    招待URL
                  </CardTitle>
                  <CardDescription>
                    メール送信サービスとは未接続。URLを安全な手段で共有してください。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      aria-label="Supplier招待URL"
                    />
                    <Button variant="outline" onClick={copyInvite}>
                      <Clipboard className="size-4" />
                      コピー
                    </Button>
                  </div>
                  <Alert className="mt-4">
                    <Users className="size-4" />
                    <AlertTitle>最小権限</AlertTitle>
                    <AlertDescription>
                      Supplier
                      Userは招待された指標と期間のみ閲覧・回答できます。このデモトークンは秘密情報ではありません。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedSupplier} / Cat.1
                  </CardTitle>
                  <CardDescription>
                    提出値 1,250 t-CO₂e · 推計 · 証憑1件
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">排出量</p>
                      <p className="mt-2 font-mono text-2xl font-semibold">
                        1,250
                      </p>
                      <p className="text-xs">t-CO₂e</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">算定区分</p>
                      <p className="mt-2 text-sm font-semibold">推計</p>
                      <p className="text-xs text-muted-foreground">
                        活動量 × DEMO係数
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">証憑</p>
                      <p className="mt-2 text-sm font-semibold">
                        supplier-ghg-demo.pdf
                      </p>
                      <p className="text-xs text-muted-foreground">
                        メタデータ確認済み
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      disabled={
                        !canManage || workspace.supplier.status !== "submitted"
                      }
                      onClick={() => {
                        workspace.requestSupplierRevision();
                        toast.success("補足依頼を記録しました");
                      }}
                    >
                      <RotateCcw className="size-4" />
                      差戻し
                    </Button>
                    <Button
                      disabled={
                        !canManage || workspace.supplier.status !== "submitted"
                      }
                      onClick={() => {
                        workspace.acceptSupplierResponse();
                        toast.success("回答を受領し、指標へ反映しました");
                      }}
                    >
                      <CheckCircle2 className="size-4" />
                      受領
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
}

function SupplierResponseForm({
  value,
  setValue,
  evidenceName,
  setEvidenceName,
  isEstimated,
  setIsEstimated,
  status,
  canSubmit,
  onSubmit,
}: {
  value: string;
  setValue: (value: string) => void;
  evidenceName: string | null;
  setEvidenceName: (value: string | null) => void;
  isEstimated: boolean;
  setIsEstimated: (value: boolean) => void;
  status: string;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert>
        <Users className="size-4" />
        <AlertTitle>招待範囲: Scope 3 Cat.1 / FY2025</AlertTitle>
        <AlertDescription>
          他社・他指標のデータは閲覧できません。回答は依頼元企業のレビュー後に受領されます。
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                購入した製品・サービスに伴う排出量
              </CardTitle>
              <CardDescription>対象期間 2025-04-01〜2026-03-31</CardDescription>
            </div>
            <Badge>{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div>
              <Label htmlFor="supplier-value">排出量</Label>
              <Input
                id="supplier-value"
                type="number"
                min="0"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>単位</Label>
              <Input value="t-CO₂e" readOnly className="mt-2" />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
            <Checkbox
              checked={isEstimated}
              onCheckedChange={(checked) => setIsEstimated(Boolean(checked))}
            />
            <span>
              <span className="block font-medium">推計値として提出</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                実測・一次データの場合はチェックを外してください
              </span>
            </span>
          </label>
          <div>
            <Label htmlFor="supplier-evidence">証憑ファイル</Label>
            <Input
              id="supplier-evidence"
              type="file"
              accept=".pdf,.csv,.xlsx"
              className="mt-2"
              onChange={(event) =>
                setEvidenceName(event.target.files?.[0]?.name ?? null)
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              PDF / CSV / XLSX、最大10MB（デモではファイル名のみ保持）
            </p>
            {evidenceName && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                <FileUp className="size-4 text-primary" />
                {evidenceName}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="supplier-note">算定方法・補足</Label>
            <Textarea
              id="supplier-note"
              className="mt-2"
              defaultValue="当社の購入電力および燃料使用量をもとに、合成デモ係数で算定しました。"
            />
          </div>
          <Button className="w-full" onClick={onSubmit} disabled={!canSubmit}>
            <Send className="size-4" />
            回答と証憑を提出
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
