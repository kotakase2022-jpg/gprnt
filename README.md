# TERRAST Sustainability Disclosure Hub

TERRASTに蓄積済みのデータを初期値として活用し、日本企業のサステナビリティ開示準備を「同期 → 不足補完 → 開示案 → レビュー／承認 → 移行計画 → 出力 → 匿名集計」まで一貫して体験できるコンセプトMVPです。

実在企業の顧客データ、TERRASTの実データ／API、正式な排出係数、基準本文は含みません。画面とseedはすべて合成デモデータです。

## 公開環境

- Production: [https://terrast-disclosure-hub-prod.vercel.app](https://terrast-disclosure-hub-prod.vercel.app)
- Preview: Vercel Git integration creates a deployment for each pull request.
- Repository: [kotakase2022-jpg/gprnt](https://github.com/kotakase2022-jpg/gprnt)

## 5分で起動

前提は Node.js 22〜24 と npm です。Supabase、OpenAI、TERRASTの資格情報がなくても、決定論的なDemo Modeで主要機能が動きます。

```bash
git clone https://github.com/kotakase2022-jpg/gprnt.git
cd gprnt
npm ci
copy .env.example .env.local
npm run dev
```

macOS / Linuxでは `cp .env.example .env.local` を使います。ブラウザで `http://localhost:3000` を開き、「上場会社デモを開始」または「プラットフォーム運営者デモを開始」を選択してください。

Demo Modeではパスワード不要です。7ロールをワンクリックで切り替えられ、操作はブラウザのlocalStorageに保存されます。`NEXT_PUBLIC_DEMO_MODE=false` とSupabase公開設定を与えた場合は、Supabase Authの実ログイン画面へ切り替わります。

## 推奨デモシナリオ

1. `Company Admin` でデモログインし、日本未来製造株式会社を選択
2. 「TERRAST同期」でDry-run、差分、手動値との競合を確認
3. 競合理由を記録して同期し、「企業・指標データ」で不足項目を追加入力
4. 「開示ワークスペース」または「AI開示支援」で根拠ID付きの案を作成
5. Reviewerへ提出し、`Reviewer / Approver` に切り替えて差戻し
6. 修正、再提出、承認を行い、「監査ログ」で履歴を検索
7. Supplier回答、GHG算定、移行施策を更新
8. 「レポート」で印刷／PDF保存、CSV、JSONを出力
9. `Platform Operator Demo Admin` へ切り替え、同意済み／匿名集計だけが反映されることを確認

## 実装済み機能

- 日本語中心のランディング、7ロールのDemo Login、デスクトップ／タブレット対応App Shell
- エグゼクティブダッシュボードと計算根拠を開示する準備度／品質スコア
- `TerrastConnector`、Mock、CSV／JSON import、実API fail-closed skeleton
- Dry-run、追加／更新／競合／未変更、競合理由、冪等同期、同期履歴
- 13領域・3社・3年度の合成データと、来歴・証憑メタデータを持つ指標モデル
- SSBJ／ISSB要求事項の独自短縮要約、ガイド質問、Draft／Review／Revision／Approval
- Scope 1／2算定、DEMO排出係数、Scope 3全15カテゴリ、Supplier回答
- 気候リスク／機会と、現状から進捗までをつなぐTransition Plan Builder
- OpenAI Responses APIのstructured output + Zod検証、根拠ID、`insufficient_evidence`、決定論的fallback
- コメント、差戻し、承認／取消、共有同意、検索可能な監査ログ
- 匿名集計と同意済み個社サマリーを分離したPlatform Operator画面
- 印刷最適化HTML、CSV、JSON、架空サービスだけのルールベースMarketplace
- Supabase migration／seed／RLS／private Storage設計、Repository Pattern、CI、hooks、E2E
- Supabase modeの`/app/data`向けRLS read adapter（選択organization＋global catalog、tenant override、厳格な来歴mapper）と、手動指標値・redacted監査イベントを同一transactionで保存するservice-only command。本番CSV exportは監査付きserver command実装までfail-closed

## 技術構成

- Next.js App Router 16 / React 19 / TypeScript strict
- Tailwind CSS 4 / shadcn-ui / Radix UI / Recharts / Lucide
- Supabase Auth / PostgreSQL / Storage / RLS
- Zod / React Hook Form / OpenAI SDK
- Vitest / React Testing Library / Playwright
- ESLint / Prettier / Husky / lint-staged / GitHub Actions / Vercel

Demo Modeの会社別UI状態は `DemoWorkspaceProvider` がlocalStorageへ保持し、同期はMock Connector → domain diff/apply → DemoRepository transactionを通ります。ドメインロジックは `src/domain`、永続化portは `src/lib/repositories`、TERRAST境界は `src/lib/terrast`、AIのサーバー境界は `src/app/api/ai/disclosure` に分離しています。

## 環境変数

`.env.example` を正とします。最低限のDemo Mode設定は次の3つです。

```dotenv
NEXT_PUBLIC_APP_NAME=TERRAST Sustainability Disclosure Hub
NEXT_PUBLIC_DEMO_MODE=true
TERRAST_CONNECTOR_MODE=mock
```

`SUPABASE_SECRET_KEY`、legacy fallbackの`SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_API_KEY`、`TERRAST_API_KEY`はサーバー専用です。新規設定では独立rotation可能な`SUPABASE_SECRET_KEY`を優先し、どちらも`NEXT_PUBLIC_*`、ログ、エラーへ置かないでください。実TERRAST APIの仕様・認証・endpointは未提示のため、`api` modeは検証済みtransportを注入するまでfail-closedです。

## 品質ゲート

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
npm run db:check
npm run agents:check
npm run check
```

pre-commitはlint-staged（Prettier + ESLint）、pre-pushはtypecheck + unit testを実行します。`npm run check` は整形・Lint・型・unit・DB静的検査・buildをまとめ、E2EとAGENTS同期は上記の個別コマンドで確認します。GitHub Actionsでは `lint`、`typecheck`、`unit-test`、`build`、`e2e-smoke`、`agents-sync`、`db-static` を独立ジョブとして実行します。公開済みDemo Mode mainの基準検証では70 unit tests、3 Playwright tests、31/31テーブルのSupabase静的検査、21 routesのproduction buildが成功しています。今回のSupabase sliceの正確な検証結果は`AI_HANDOFF.md`へ記録し、remote実行とは区別します。

## Supabase

初回migrationは`supabase/migrations/20260712100436_init_terrast_schema.sql`、最初の実データpath追加は`supabase/migrations/20260712143139_save_manual_metric_value_with_audit.sql`、合成seedは`supabase/seed.sql`です。後者は、`/app/data`が会社・期間・organization scoped catalog・指標値・証憑IDをRLS下で読み、`POST /api/workspace/metric-values`が認証・同一の実効role membership・tenant/resource・型・単位を再確認した後に、手動指標値とvalue/reason/scope/boundary hashを含むaudit eventをservice-only RPCでatomic保存するためのschemaです。手動rowはmetric UUIDで安定識別し、code rename後もversion履歴を分裂させません。他の非AI mutationと本番exportは引き続き明示的にfail-closedです。

ローカルSupabaseが使える環境では次を実行します。

```bash
supabase start
supabase db reset
supabase db lint --local
supabase test db supabase/tests --local
```

Demo Modeの完了にremote Supabaseは不要です。今回の実データpathを含むmigration適用、pgTAP、RLS／Storageの正負テスト、Database／Security Advisorはremote projectでは未実施です。実運用への移行前にisolated projectで実行し、バックアップ／PITR、保持・削除方針も確認してください。

## ドキュメント

- [プロダクト要件](docs/PRODUCT_REQUIREMENTS.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [データモデル](docs/DATA_MODEL.md)
- [TERRAST連携](docs/TERRAST_INTEGRATION.md)
- [セキュリティ](docs/SECURITY.md)
- [デプロイ](docs/DEPLOYMENT.md)
- [仮定](docs/ASSUMPTIONS.md)
- [JPX向けデモ進行](docs/JPX_PARTNERSHIP_DEMO.md)
- [ロードマップ](docs/ROADMAP.md)
- [OpenAPI](docs/openapi.yaml)
- [自己評価と改善記録](docs/SELF_EVALUATION.md)
- [AI引継ぎ](AI_HANDOFF.md)

## 重要な制約

- JPXとの正式提携、承認、提供関係を示すものではありません。
- SSBJ／ISSBへの適合性、保証、法的結論を判定する機能ではありません。
- OpenAI出力は常に「AI提案・要レビュー」であり、人による根拠確認と承認が必要です。
- Supabase実認証とAIのtenant／根拠再照合に加え、`/app/data`のRLS readと手動指標値の監査付きatomic commandは実装済みです。その他の非AI mutationはfail-closedであり、remote Supabaseへのmigration適用・pgTAP・RLS／Storage・Advisor検証も未実施です。
- Production向けの実TERRAST接続、remote Supabase適用、マルウェアスキャン、SSO／SCIM、分散rate limit、WAF、外部保証連携は追加の本番化ゲートです。
