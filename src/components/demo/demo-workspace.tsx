"use client";

import * as React from "react";
import { demoCompanies, useDemoSession } from "@/components/demo/demo-session";

export type SyncClassification = "added" | "updated" | "conflict" | "unchanged";
export type ConflictResolution = "keep_manual" | "accept_terrast";
export type DisclosureStatus =
  | "not_started"
  | "data_available"
  | "drafted"
  | "in_review"
  | "revision_requested"
  | "approved";

export type SyncItem = {
  id: string;
  metricCode: string;
  label: string;
  currentValue: string | null;
  terrastValue: string;
  unit: string;
  classification: SyncClassification;
  selected: boolean;
  source: string;
  acquiredAt: string;
  period: string;
  confidence: "high" | "medium";
  resolution?: ConflictResolution;
  reason?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  summary: string;
  correlationId: string;
};

export type WorkspaceMetric = {
  id: string;
  metricCode: string;
  label: string;
  category: string;
  period: string;
  value: string;
  unit: string;
  source: "TERRAST" | "Manual" | "Calculated" | "Supplier";
  confidence: number;
  verification: "Verified" | "Evidence attached" | "Pending";
  updatedAt: string;
  changeReason?: string;
  consolidationScope?: string;
  organizationalBoundary?: string;
  catalogState?: "current" | "historical";
};

type WorkspaceMetricInput = Pick<
  WorkspaceMetric,
  | "metricCode"
  | "label"
  | "category"
  | "value"
  | "unit"
  | "changeReason"
  | "consolidationScope"
  | "organizationalBoundary"
>;

type WorkspaceState = {
  baseReadiness: number;
  lastSyncAt: string | null;
  syncRuns: number;
  terrastCount: number;
  additionalInputs: number;
  syncItems: SyncItem[];
  metrics: WorkspaceMetric[];
  disclosure: {
    requirementId: string;
    status: DisclosureStatus;
    draft: string;
    comments: { id: string; author: string; body: string; at: string }[];
    revisionReason: string | null;
    approvedAt: string | null;
  };
  supplier: {
    requests: number;
    responses: number;
    dueDate: string;
    inviteId: string;
    status: "draft" | "sent" | "submitted" | "revision_requested" | "accepted";
  };
  transitionActions: {
    id: string;
    title: string;
    owner: string;
    investment: string;
    progress: number;
    targetYear: number;
  }[];
  ai: {
    generatedAt: string | null;
    output: string | null;
    evidenceIds: string[];
    promptVersion: string;
    model: string;
    inputHash: string;
    mode: "demo" | "api";
  };
  sharingConsent: boolean;
  audit: AuditEntry[];
};

export type DemoCompanySummary = {
  companyId: string;
  companyName: string;
  companyCode: string;
  readiness: number;
  dataQuality: number;
  terrastCount: number;
  additionalInputs: number;
  sharingConsent: boolean;
  disclosureStatus: DisclosureStatus;
  supplierResponseRate: number;
  transitionProgress: number;
  syncRuns: number;
};

type DemoWorkspaceValue = WorkspaceState & {
  companySummaries: DemoCompanySummary[];
  toggleSyncItem: (id: string) => void;
  resolveConflict: (
    id: string,
    resolution: ConflictResolution,
    reason?: string,
  ) => void;
  executeSync: () => { applied: number; skipped: number };
  addMetric: (input: WorkspaceMetricInput) => void;
  saveDraft: (draft: string) => void;
  applyAiDraft: (
    draft: string,
    evidenceIds: string[],
    meta?: {
      model?: string;
      inputHash?: string;
      mode?: "demo" | "api";
      promptVersion?: string;
    },
  ) => void;
  submitForReview: () => void;
  requestRevision: (reason: string) => void;
  approveDisclosure: () => void;
  cancelApproval: (reason: string) => void;
  addComment: (body: string) => void;
  sendSupplierRequest: (dueDate: string) => void;
  submitSupplierResponse: () => void;
  requestSupplierRevision: () => void;
  acceptSupplierResponse: () => void;
  updateTransitionProgress: (id: string, progress: number) => void;
  updateTransitionAction: (
    id: string,
    patch: Partial<
      Pick<
        WorkspaceState["transitionActions"][number],
        "title" | "owner" | "investment" | "targetYear"
      >
    >,
  ) => void;
  setSharingConsent: (value: boolean) => void;
  resetWorkspace: () => void;
};

const STORAGE_KEY = "terrast-demo-workspace-v1";
const WorkspaceContext = React.createContext<DemoWorkspaceValue | null>(null);

const initialState: WorkspaceState = {
  baseReadiness: 68,
  lastSyncAt: null,
  syncRuns: 0,
  terrastCount: 38,
  additionalInputs: 14,
  syncItems: [
    {
      id: "sync-1",
      metricCode: "GHG-S1",
      label: "Scope 1 排出量",
      currentValue: "12,680",
      terrastValue: "12,420",
      unit: "t-CO₂e",
      classification: "updated",
      selected: true,
      source: "TERRAST / DEMO DATA",
      acquiredAt: "2026-07-11",
      period: "FY2025",
      confidence: "high",
    },
    {
      id: "sync-2",
      metricCode: "GHG-S2-LB",
      label: "Scope 2（ロケーション基準）",
      currentValue: "8,940",
      terrastValue: "8,710",
      unit: "t-CO₂e",
      classification: "updated",
      selected: true,
      source: "TERRAST / DEMO DATA",
      acquiredAt: "2026-07-11",
      period: "FY2025",
      confidence: "high",
    },
    {
      id: "sync-3",
      metricCode: "ENERGY-REN",
      label: "再生可能エネルギー比率",
      currentValue: null,
      terrastValue: "31.8",
      unit: "%",
      classification: "added",
      selected: true,
      source: "TERRAST / DEMO DATA",
      acquiredAt: "2026-07-11",
      period: "FY2025",
      confidence: "medium",
    },
    {
      id: "sync-4",
      metricCode: "WATER-WD",
      label: "取水量",
      currentValue: "126,400",
      terrastValue: "124,900",
      unit: "m³",
      classification: "conflict",
      selected: true,
      source: "TERRAST / DEMO DATA",
      acquiredAt: "2026-07-11",
      period: "FY2025",
      confidence: "high",
    },
    {
      id: "sync-5",
      metricCode: "HC-WOMEN-MGR",
      label: "女性管理職比率",
      currentValue: "18.4",
      terrastValue: "18.4",
      unit: "%",
      classification: "unchanged",
      selected: false,
      source: "TERRAST / DEMO DATA",
      acquiredAt: "2026-07-11",
      period: "FY2025",
      confidence: "high",
    },
  ],
  metrics: [
    {
      id: "m-1",
      metricCode: "GHG-S1",
      label: "Scope 1 排出量",
      category: "GHG排出",
      period: "FY2025",
      value: "12,680",
      unit: "t-CO₂e",
      source: "Manual",
      confidence: 82,
      verification: "Evidence attached",
      updatedAt: "2026-07-08",
    },
    {
      id: "m-2",
      metricCode: "GHG-S2-LB",
      label: "Scope 2（ロケーション基準）",
      category: "GHG排出",
      period: "FY2025",
      value: "8,940",
      unit: "t-CO₂e",
      source: "TERRAST",
      confidence: 94,
      verification: "Verified",
      updatedAt: "2026-07-08",
    },
    {
      id: "m-3",
      metricCode: "GHG-S3-C1",
      label: "Scope 3 カテゴリー1",
      category: "サプライチェーン",
      period: "FY2025",
      value: "42,300",
      unit: "t-CO₂e",
      source: "Calculated",
      confidence: 61,
      verification: "Pending",
      updatedAt: "2026-07-07",
    },
    {
      id: "m-4",
      metricCode: "ENERGY-TOTAL",
      label: "総エネルギー使用量",
      category: "エネルギー",
      period: "FY2025",
      value: "298,000",
      unit: "MWh",
      source: "TERRAST",
      confidence: 96,
      verification: "Verified",
      updatedAt: "2026-07-08",
    },
    {
      id: "m-5",
      metricCode: "WATER-WD",
      label: "取水量",
      category: "水",
      period: "FY2025",
      value: "126,400",
      unit: "m³",
      source: "Manual",
      confidence: 78,
      verification: "Evidence attached",
      updatedAt: "2026-07-04",
    },
    {
      id: "m-6",
      metricCode: "HC-WOMEN-MGR",
      label: "女性管理職比率",
      category: "人的資本",
      period: "FY2025",
      value: "18.4",
      unit: "%",
      source: "TERRAST",
      confidence: 91,
      verification: "Verified",
      updatedAt: "2026-07-05",
    },
  ],
  disclosure: {
    requirementId: "SSBJ-CLIMATE-DEMO-07",
    status: "data_available",
    draft:
      "当社は、Scope 1およびScope 2排出量を対象に、FY2025の算定を実施しました。Scope 3については主要カテゴリーのデータ収集を継続しています。",
    comments: [],
    revisionReason: null,
    approvedAt: null,
  },
  supplier: {
    requests: 24,
    responses: 15,
    dueDate: "2026-08-31",
    inviteId: "SUP-DEMO-7K4P",
    status: "sent",
  },
  transitionActions: [
    {
      id: "ta-1",
      title: "主要工場の再エネ電力切替",
      owner: "生産技術部",
      investment: "CapEx 4.2億円",
      progress: 68,
      targetYear: 2028,
    },
    {
      id: "ta-2",
      title: "高効率ボイラーへの更新",
      owner: "設備管理部",
      investment: "CapEx 2.8億円",
      progress: 42,
      targetYear: 2027,
    },
    {
      id: "ta-3",
      title: "主要サプライヤー一次データ収集",
      owner: "調達統括部",
      investment: "OpEx 0.6億円",
      progress: 35,
      targetYear: 2026,
    },
  ],
  ai: {
    generatedAt: null,
    output: null,
    evidenceIds: [],
    promptVersion: "disclosure-assistant-v2",
    model: "deterministic-demo",
    inputHash: "",
    mode: "demo",
  },
  sharingConsent: true,
  audit: [
    {
      id: "audit-seed-1",
      at: "2026-07-10T04:30:00.000Z",
      actor: "佐藤 美咲",
      role: "Preparer",
      action: "evidence.attached",
      resource: "GHG-S1/FY2025",
      summary: "燃料使用量集計表を証憑として登録",
      correlationId: "COR-DEMO-A1",
    },
    {
      id: "audit-seed-2",
      at: "2026-07-09T06:15:00.000Z",
      actor: "田中 健",
      role: "Company Admin",
      action: "sharing.consent.updated",
      resource: "company-sharing",
      summary: "匿名集計への共有同意を更新",
      correlationId: "COR-DEMO-A2",
    },
  ],
};

function cloneInitialState(): WorkspaceState {
  return JSON.parse(JSON.stringify(initialState)) as WorkspaceState;
}

type WorkspaceStore = {
  version: 2;
  companies: Record<string, WorkspaceState>;
};

function createInitialStore(): WorkspaceStore {
  const manufacturing = cloneInitialState();
  const retail = cloneInitialState();
  retail.baseReadiness = 59;
  retail.terrastCount = 27;
  retail.additionalInputs = 24;
  retail.sharingConsent = false;
  retail.supplier = {
    ...retail.supplier,
    requests: 40,
    responses: 14,
    inviteId: "SUP-DEMO-RETAIL",
  };
  retail.transitionActions = retail.transitionActions.map((action, index) => ({
    ...action,
    progress: [28, 22, 31][index] ?? action.progress,
  }));

  const services = cloneInitialState();
  services.baseReadiness = 81;
  services.terrastCount = 45;
  services.additionalInputs = 7;
  services.disclosure = {
    ...services.disclosure,
    status: "drafted",
    draft:
      "人的資本情報と低炭素サービスの提供状況を、登録済みデータに基づき整理しています。",
  };
  services.supplier = {
    ...services.supplier,
    requests: 12,
    responses: 10,
    inviteId: "SUP-DEMO-SERVICE",
  };
  services.transitionActions = services.transitionActions.map(
    (action, index) => ({
      ...action,
      progress: [82, 64, 71][index] ?? action.progress,
    }),
  );

  return {
    version: 2,
    companies: {
      "mirai-manufacturing": manufacturing,
      "next-retail": retail,
      "green-tech-services": services,
    },
  };
}

function summarizeCompany(
  companyId: string,
  state: WorkspaceState,
): DemoCompanySummary {
  const company =
    demoCompanies.find((candidate) => candidate.id === companyId) ??
    demoCompanies[0];
  const average = (values: number[]) =>
    values.length
      ? Math.round(
          values.reduce((total, value) => total + value, 0) / values.length,
        )
      : 0;
  return {
    companyId,
    companyName: company.name,
    companyCode: company.code,
    readiness: Math.min(
      100,
      state.baseReadiness +
        state.syncRuns * 4 +
        (state.disclosure.status === "approved" ? 8 : 0),
    ),
    dataQuality: average(state.metrics.map((metric) => metric.confidence)),
    terrastCount: state.terrastCount,
    additionalInputs: state.additionalInputs,
    sharingConsent: state.sharingConsent,
    disclosureStatus: state.disclosure.status,
    supplierResponseRate: state.supplier.requests
      ? Math.round((state.supplier.responses / state.supplier.requests) * 100)
      : 0,
    transitionProgress: average(
      state.transitionActions.map((action) => action.progress),
    ),
    syncRuns: state.syncRuns,
  };
}

export function DemoWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, companyId } = useDemoSession();
  const [store, setStore] = React.useState<WorkspaceStore>(() =>
    createInitialStore(),
  );
  const [hydrated, setHydrated] = React.useState(false);
  const state = store.companies[companyId] ?? cloneInitialState();

  const setState = React.useCallback(
    (update: React.SetStateAction<WorkspaceState>) => {
      setStore((currentStore) => {
        const current =
          currentStore.companies[companyId] ?? cloneInitialState();
        const next =
          typeof update === "function"
            ? (update as (value: WorkspaceState) => WorkspaceState)(current)
            : update;
        return {
          ...currentStore,
          companies: { ...currentStore.companies, [companyId]: next },
        };
      });
    },
    [companyId],
  );

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as WorkspaceStore | WorkspaceState;
          if (
            parsed &&
            typeof parsed === "object" &&
            "version" in parsed &&
            parsed.version === 2
          ) {
            setStore(parsed);
          } else {
            const migrated = createInitialStore();
            migrated.companies["mirai-manufacturing"] = {
              ...cloneInitialState(),
              ...(parsed && typeof parsed === "object" ? parsed : {}),
              baseReadiness: 68,
            };
            setStore(migrated);
          }
        }
      } catch {
        // Continue with deterministic seed when storage is unavailable.
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store, hydrated]);

  React.useEffect(() => {
    const reset = () => setStore(createInitialStore());
    window.addEventListener("terrast-demo-reset", reset);
    return () => window.removeEventListener("terrast-demo-reset", reset);
  }, []);

  const mutate = React.useCallback(
    (
      action: string,
      resource: string,
      summary: string,
      recipe: (current: WorkspaceState) => WorkspaceState,
    ) => {
      setState((current) => {
        const next = recipe(current);
        const at = new Date().toISOString();
        const audit: AuditEntry = {
          id: `audit-${Date.now()}-${current.audit.length}`,
          at,
          actor: "デモユーザー",
          role,
          action,
          resource,
          summary,
          correlationId: `COR-${Date.now().toString(36).toUpperCase()}`,
        };
        return { ...next, audit: [audit, ...next.audit] };
      });
    },
    [role, setState],
  );

  const value: DemoWorkspaceValue = {
    ...state,
    companySummaries: Object.entries(store.companies).map(
      ([id, companyState]) => summarizeCompany(id, companyState),
    ),
    toggleSyncItem(id) {
      setState((current) => ({
        ...current,
        syncItems: current.syncItems.map((item) =>
          item.id === id ? { ...item, selected: !item.selected } : item,
        ),
      }));
    },
    resolveConflict(id, resolution, reason) {
      if (resolution === "keep_manual" && !reason?.trim())
        throw new Error("手動値を維持する理由を入力してください。");
      mutate(
        "sync.conflict_resolved",
        id,
        resolution === "keep_manual" ? "手動値を維持" : "TERRAST値を採用",
        (current) => ({
          ...current,
          syncItems: current.syncItems.map((item) =>
            item.id === id ? { ...item, resolution, reason } : item,
          ),
        }),
      );
    },
    executeSync() {
      const eligible = state.syncItems.filter(
        (item) =>
          item.selected &&
          (item.classification !== "conflict" || item.resolution),
      );
      const skipped =
        state.syncItems.filter((item) => item.selected).length -
        eligible.length;
      const applied = eligible.filter(
        (item) =>
          item.classification !== "unchanged" &&
          item.resolution !== "keep_manual",
      ).length;
      mutate(
        "terrast.sync.executed",
        "sync-job",
        `${applied}件を反映、${skipped}件を保留`,
        (current) => {
          const now = new Date().toISOString();
          const imported = eligible
            .filter(
              (item) =>
                item.classification !== "unchanged" &&
                item.resolution !== "keep_manual",
            )
            .map<WorkspaceMetric>((item) => ({
              id: `metric-${item.id}`,
              metricCode: item.metricCode,
              label: item.label,
              category: item.metricCode.startsWith("GHG") ? "GHG排出" : "環境",
              period: item.period,
              value: item.terrastValue,
              unit: item.unit,
              source: "TERRAST",
              confidence: item.confidence === "high" ? 95 : 76,
              verification: "Evidence attached",
              updatedAt: now.slice(0, 10),
            }));
          const importedCodes = new Set(
            imported.map((metric) => metric.metricCode),
          );
          return {
            ...current,
            lastSyncAt: now,
            syncRuns: current.syncRuns + 1,
            terrastCount: current.terrastCount + applied,
            additionalInputs: Math.max(0, current.additionalInputs - applied),
            metrics: [
              ...imported,
              ...current.metrics.filter(
                (metric) => !importedCodes.has(metric.metricCode),
              ),
            ],
            syncItems: current.syncItems.map((item) =>
              eligible.some((candidate) => candidate.id === item.id)
                ? {
                    ...item,
                    currentValue:
                      item.resolution === "keep_manual"
                        ? item.currentValue
                        : item.terrastValue,
                    classification: "unchanged" as const,
                    selected: false,
                  }
                : item,
            ),
          };
        },
      );
      return { applied, skipped };
    },
    addMetric(input) {
      mutate(
        "metric.created",
        input.metricCode,
        `${input.label}を手動入力${input.changeReason ? `（理由: ${input.changeReason}）` : ""}`,
        (current) => ({
          ...current,
          additionalInputs: Math.max(0, current.additionalInputs - 1),
          metrics: [
            {
              id: `metric-manual-${Date.now()}`,
              period: "FY2025",
              source: "Manual",
              confidence: 70,
              verification: "Pending",
              updatedAt: new Date().toISOString().slice(0, 10),
              ...input,
            },
            ...current.metrics,
          ],
        }),
      );
    },
    saveDraft(draft) {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールには開示案の編集権限がありません。");
      if (["in_review", "approved"].includes(state.disclosure.status))
        throw new Error("レビュー中または承認済みの開示案は編集できません。");
      mutate(
        "disclosure.draft.updated",
        state.disclosure.requirementId,
        "開示案を保存",
        (current) => ({
          ...current,
          disclosure: {
            ...current.disclosure,
            draft,
            status: "drafted",
            revisionReason: null,
          },
        }),
      );
    },
    applyAiDraft(draft, evidenceIds, meta) {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールにはAI案の反映権限がありません。");
      if (["in_review", "approved"].includes(state.disclosure.status))
        throw new Error("レビュー中または承認済みの開示案は変更できません。");
      mutate(
        "ai.disclosure.generated",
        state.disclosure.requirementId,
        `根拠${evidenceIds.length}件からAI提案を生成 (${meta?.model ?? "deterministic-demo"})`,
        (current) => ({
          ...current,
          ai: {
            generatedAt: new Date().toISOString(),
            output: draft,
            evidenceIds,
            promptVersion: meta?.promptVersion ?? "disclosure-assistant-v2",
            model: meta?.model ?? "deterministic-demo",
            inputHash: meta?.inputHash ?? "demo-input",
            mode: meta?.mode ?? "demo",
          },
          disclosure: { ...current.disclosure, draft, status: "drafted" },
        }),
      );
    },
    submitForReview() {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールにはレビュー提出権限がありません。");
      if (state.disclosure.status !== "drafted")
        throw new Error("Drafted状態の開示案だけをレビューへ提出できます。");
      mutate(
        "review.submitted",
        state.disclosure.requirementId,
        "レビューへ提出",
        (current) => ({
          ...current,
          disclosure: { ...current.disclosure, status: "in_review" },
        }),
      );
    },
    requestRevision(reason) {
      if (
        !["system_admin", "company_admin", "reviewer_approver"].includes(role)
      )
        throw new Error("このロールには差戻し権限がありません。");
      if (state.disclosure.status !== "in_review")
        throw new Error("In Review状態の開示案だけを差し戻せます。");
      if (!reason.trim()) throw new Error("差戻し理由を入力してください。");
      mutate(
        "review.revision_requested",
        state.disclosure.requirementId,
        reason,
        (current) => ({
          ...current,
          disclosure: {
            ...current.disclosure,
            status: "revision_requested",
            revisionReason: reason,
          },
        }),
      );
    },
    approveDisclosure() {
      if (
        !["system_admin", "company_admin", "reviewer_approver"].includes(role)
      )
        throw new Error("このロールには承認権限がありません。");
      if (state.disclosure.status !== "in_review")
        throw new Error("In Review状態の開示案だけを承認できます。");
      mutate(
        "approval.granted",
        state.disclosure.requirementId,
        "開示案を承認",
        (current) => ({
          ...current,
          disclosure: {
            ...current.disclosure,
            status: "approved",
            approvedAt: new Date().toISOString(),
          },
        }),
      );
    },
    cancelApproval(reason) {
      if (
        !["system_admin", "company_admin", "reviewer_approver"].includes(role)
      )
        throw new Error("このロールには承認取消権限がありません。");
      if (state.disclosure.status !== "approved")
        throw new Error("Approved状態の開示案だけ承認を取り消せます。");
      if (!reason.trim()) throw new Error("承認取消理由を入力してください。");
      mutate(
        "approval.revoked",
        state.disclosure.requirementId,
        reason,
        (current) => ({
          ...current,
          disclosure: {
            ...current.disclosure,
            status: "revision_requested",
            revisionReason: reason,
            approvedAt: null,
          },
        }),
      );
    },
    addComment(body) {
      if (!body.trim()) return;
      mutate(
        "review.comment.created",
        state.disclosure.requirementId,
        "レビューコメントを追加",
        (current) => ({
          ...current,
          disclosure: {
            ...current.disclosure,
            comments: [
              ...current.disclosure.comments,
              {
                id: `comment-${Date.now()}`,
                author: "デモユーザー",
                body,
                at: new Date().toISOString(),
              },
            ],
          },
        }),
      );
    },
    sendSupplierRequest(dueDate) {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールにはSupplier依頼の作成権限がありません。");
      const inviteId = `demo-${globalThis.crypto.randomUUID()}`;
      mutate(
        "supplier.request.sent",
        inviteId,
        `回答期限 ${dueDate} で依頼を送信`,
        (current) => ({
          ...current,
          supplier: {
            ...current.supplier,
            dueDate,
            inviteId,
            status: "sent",
          },
        }),
      );
    },
    submitSupplierResponse() {
      if (role !== "supplier_user")
        throw new Error("Supplier Userだけが回答を提出できます。");
      if (!["sent", "revision_requested"].includes(state.supplier.status))
        throw new Error("回答可能な状態ではありません。");
      mutate(
        "supplier.response.submitted",
        state.supplier.inviteId,
        "サプライヤー回答と証憑を提出",
        (current) => ({
          ...current,
          supplier: {
            ...current.supplier,
            status: "submitted",
            responses: Math.min(
              current.supplier.requests,
              current.supplier.responses + 1,
            ),
          },
        }),
      );
    },
    requestSupplierRevision() {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールにはSupplier回答の差戻し権限がありません。");
      if (state.supplier.status !== "submitted")
        throw new Error("Submitted状態の回答だけを差し戻せます。");
      mutate(
        "supplier.response.revision_requested",
        state.supplier.inviteId,
        "回答の補足を依頼",
        (current) => ({
          ...current,
          supplier: { ...current.supplier, status: "revision_requested" },
        }),
      );
    },
    acceptSupplierResponse() {
      if (!["system_admin", "company_admin", "preparer"].includes(role))
        throw new Error("このロールにはSupplier回答の受領権限がありません。");
      if (state.supplier.status !== "submitted")
        throw new Error("Submitted状態の回答だけを受領できます。");
      mutate(
        "supplier.response.accepted",
        state.supplier.inviteId,
        "サプライヤー回答を受領",
        (current) => ({
          ...current,
          supplier: { ...current.supplier, status: "accepted" },
        }),
      );
    },
    updateTransitionProgress(id, progress) {
      mutate(
        "transition.action.updated",
        id,
        `進捗を${progress}%へ更新`,
        (current) => ({
          ...current,
          transitionActions: current.transitionActions.map((action) =>
            action.id === id ? { ...action, progress } : action,
          ),
        }),
      );
    },
    updateTransitionAction(id, patch) {
      mutate(
        "transition.action.updated",
        id,
        "移行施策の内容を更新",
        (current) => ({
          ...current,
          transitionActions: current.transitionActions.map((action) =>
            action.id === id ? { ...action, ...patch } : action,
          ),
        }),
      );
    },
    setSharingConsent(value) {
      mutate(
        "sharing.consent.updated",
        "company-sharing",
        value ? "匿名集計への共有に同意" : "共有同意を取り消し",
        (current) => ({ ...current, sharingConsent: value }),
      );
    },
    resetWorkspace() {
      setStore(createInitialStore());
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("terrast-disclosure-hub:demo:v1");
    },
  };

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useDemoWorkspace() {
  const value = React.use(WorkspaceContext);
  if (!value)
    throw new Error(
      "useDemoWorkspace must be used within DemoWorkspaceProvider",
    );
  return value;
}
