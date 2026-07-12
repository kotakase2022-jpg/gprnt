# AI Handoff

## Cycle 3 — audited release candidate

- **Current branch:** `agent/terrast-disclosure-hub-mvp`
- **Target PR:** [#1](https://github.com/kotakase2022-jpg/gprnt/pull/1) against `main`
- **Cycle number:** 3 (derived from the initial implementation and two recorded improvement passes; the three-cycle autonomous-improvement limit is reached)
- **Status:** local/CI/Preview/Production are green and main protection is active; protected PR merge and main deployment reconciliation remain
- **Evaluation:** 87 / 100; see `docs/SELF_EVALUATION.md`

### Improvement history

1. **Cycle 1 — initial MVP and demo comprehension:** built the Next.js foundation, original Japanese UI, full feature surface, synthetic data, responsive shell, landing value story and exact concept disclaimer.
2. **Cycle 2 — trust boundary:** added fail-closed runtime auth, route/action RBAC, company-isolated demo state, consent-aware operator aggregation, AI source authorization/evidence allow-list/provenance, CSV injection defense, server-owned database writes and Storage/RLS hardening. Independent audit moved the working score from 70 to 81.
3. **Cycle 3 — workflow and release proof:** closed role/state transition bypasses, approval editing, company/prompt provenance mismatches and public demo-AI text injection; made AI audit persistence atomic with correlation IDs; aligned OpenAPI/security docs; expanded negative unit/E2E checks.

### Completed items

- Landing, passwordless demo login, seven roles, role-aware navigation/deep-link denial, three isolated fictional companies and resettable local state.
- Dashboard, TERRAST Sync Center, metric data, disclosure workspace, GHG/Scope 3, Supplier, transition plan, grounded AI assistant, review/approval, operator, reports, marketplace, audit and settings screens.
- Mock connector, validated CSV/JSON import adapters, fail-closed API connector skeleton, mapping/diff/conflict/idempotency/provenance domain and DemoRepository transaction.
- Review → revision → resubmit → approval with role/state invariants and approved-draft edit lock; Supplier submit/revision/accept state guards.
- Supabase Auth guard and trusted role handling. Non-AI `SupabaseRepository` remains deliberately fail-closed; Supabase mode does not pretend to be a complete data workspace.
- AI route reloads authoritative Supabase sources under the user RLS context, validates permitted evidence IDs, rejects endorsement/compliance/assurance claims and stores AI/audit provenance atomically through a service-role-only `SECURITY INVOKER` RPC. Public Demo Mode is deterministic, does not call OpenAI, and sanitizes client prose.
- Initial migration with 31 public tables, forced RLS, server-owned histories, company consent, supplier/assurer scope, private evidence Storage and synthetic three-company seed.
- Print/PDF browser flow, CSV formula neutralization, JSON downloads, CI, Husky/lint-staged, CodeRabbit config, branch-protection runbook, OpenAPI and required product/security/deployment documents.

### Changed files

- Application: `src/app/**`, `src/components/**`, `src/data/**`
- Domain/adapters: `src/domain/**`, `src/lib/ai/**`, `src/lib/auth/**`, `src/lib/repositories/**`, `src/lib/terrast/**`, `src/lib/supabase/**`
- Tests: `src/**/*.test.*`, `e2e/critical-flow.spec.ts`, `scripts/check-supabase.mjs`
- Database: `supabase/migrations/20260712100436_init_terrast_schema.sql`, `supabase/seed.sql`, `supabase/tests/**`
- Delivery: `.github/**`, `.coderabbit.yaml`, `.husky/**`, `vercel.json`, `.env.example`, `package*.json`
- Documents: `README.md`, `AGENTS.md`, `CLAUDE.md`, `AI_HANDOFF.md`, `docs/**`

### DB migration

- Migration: `20260712100436_init_terrast_schema.sql`
- Static result: 31/31 public tables covered by the RLS loop; server-owned workflow, Storage and synthetic-seed guards passed.
- AI provenance: `public.append_ai_generation_with_audit(...)` inserts the generation and audit event in one transaction, runs as `SECURITY INVOKER`, and is executable only by `service_role`.
- Not applied to a remote project. Local Docker Desktop could not be started, so `supabase db reset`, `db lint` and pgTAP were not executed. This blocks Supabase-backed production mode, not the credential-free synthetic demo.
- Rollback: for an isolated unshared demo database use `supabase db reset`; shared environments require a reviewed forward/compensating migration and backup/PITR plan, never a destructive reset.

### Environment variable changes

- `.env.example` documents Demo Mode, Supabase public/server separation, optional OpenAI, future TERRAST adapter and AI rate limits.
- Vercel project `terrast-disclosure-hub` exists in `kotakase2022-jpgs-projects`, is linked to `kotakase2022-jpg/gprnt`, and has `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEMO_MODE=true`, `TERRAST_CONNECTOR_MODE=mock` for Development/Preview/Production.
- No Supabase/OpenAI/TERRAST secret is configured or committed. Evidence TTL/max-size settings are explicitly reserved until those server commands exist.

### Tests executed and results

- `npm run check`: passed — Prettier, ESLint with zero warnings, TypeScript strict, 19 files / 70 unit tests, Supabase static checks, Next.js production build.
- `npm run test:coverage`: passed — statements 71.47%, branches 69.30%, functions 66.28%, lines 72.30%; domain statements 88.03%.
- `npm run test:e2e`: passed — 3/3 Chromium tests. Golden scenario covers login, company selection, sync preview/apply/conflict, missing input, AI draft, submit, revision, edit, resubmit, approval, approved edit lock, report, operator reflection; additional tests cover tablet layout, company isolation and denied role deep links.
- `PLAYWRIGHT_BASE_URL=https://terrast-disclosure-85q5ks9uu-kotakase2022-jpgs-projects.vercel.app npm run test:e2e`: passed — the same 3/3 tests against the public Vercel Preview, with no captured console/page errors.
- `npm run agents:check`: passed — `AGENTS.md` and `CLAUDE.md` are byte-identical.
- Build output: 21 routes including dynamic `/api/ai/disclosure`.
- `npm audit`: two moderate transitive advisories from Next.js's bundled PostCSS remain; npm's suggested force fix is a destructive Next.js downgrade and was not applied.

### Deployment / external state

- **Vercel Production URL:** https://terrast-disclosure-hub.vercel.app — READY; remote Playwright 3/3, custom 404 and clean browser errors verified on deployment `dpl_Gq8BCey1zQzWkzcjbovjmmTjTD7c`; reconcile with the main-triggered deployment after merge
- **Vercel Preview URL:** https://terrast-disclosure-85q5ks9uu-kotakase2022-jpgs-projects.vercel.app — READY; landing, demo, golden E2E, tablet, tenant/RBAC checks and custom 404 verified
- **GitHub PR URL:** https://github.com/kotakase2022-jpg/gprnt/pull/1
- **Vercel project/Git integration/non-secret Demo env:** configured
- **Remote Supabase:** not created or applied
- **GitHub CI:** all seven required jobs passed on commit `8447c96`: `lint`, `typecheck`, `unit-test`, `build`, `e2e-smoke`, `agents-sync`, `db-static`; Vercel checks also passed.
- **Branch protection:** active and API-verified — PR required for admins, strict seven checks, conversation resolution, stale-review dismissal, force push/deletion blocked; approvals remain zero for the documented single-maintainer bootstrap.

### External review status

- Independent Codex subagents performed security/workflow and release-document audits. All demo-release P1 code findings were fixed or converted to explicit, fail-closed production gates.
- Claude Code CLI `2.1.207` was invoked after reading the shared rules, but independent review could not run because the CLI returned `Not logged in · Please run /login`. Do not claim Claude review completed.
- CodeRabbit: no review or comment was received on PR #1 after CI completed, so it supplied no actionable review.
- Cursor Bugbot: not manually invoked. Its installed GitHub check automatically attempted to run after CodeRabbit produced no review, but finished neutral with `usage limit reached`; no findings were produced.

### Unresolved items

- **Production-mode P0:** implement the non-AI `SupabaseRepository` schema adapter and audited server commands; execute migration, RLS/Storage negative tests, pgTAP and advisor checks in an isolated project.
- TERRAST real API specification, auth, endpoint, payload, field ownership, rate limit, SLA and sandbox remain unknown. API mode stays fail-closed.
- Supplier demo URL is presentation-only. Real token redemption/expiry/rotation/identity binding and evidence signed-URL/upload server commands are not wired.
- Production factors/taxonomy licensing, legal wording, consent, retention/deletion, malware scanning, SSO/SCIM, distributed rate limit/WAF, observability and operating ownership remain gates.
- JPX has not approved, provided or partnered on this product. Every major screen must retain the exact concept disclaimer.

### Next priorities

- **P0:** resolve any late review, mark PR #1 ready, merge through protection, confirm the Git-connected main deployment uses the merged commit, and record the final merge/deployment identity.
- **P1:** implement and verify the Supabase non-AI data path, server exports/evidence commands and real invitation redemption in an isolated preview environment.
- **P2:** implement a real TERRAST connector only after an approved interface-control document and sandbox credentials exist; complete enterprise security/governance/operations.

### Claude Code review focus

- Read `AGENTS.md` and `CLAUDE.md` first and verify byte identity.
- Review `src/domain/disclosure-workflow.ts`, `src/components/demo/demo-workspace.tsx` and the SQL server-owned workflow boundary for role/state/content mutation consistency.
- Review `src/app/api/ai/disclosure/route.ts`, `src/lib/ai/schema.ts` and the atomic RPC for source authorization, text injection, evidence allow-list, correlation/audit behavior and fail-closed errors.
- Review the gap between authenticated shell/AI route and the unimplemented non-AI `SupabaseRepository` before any claim of production data readiness.

### Concrete prompt for the next AI

> Read `AGENTS.md`, `CLAUDE.md`, `AI_HANDOFF.md` and `docs/SELF_EVALUATION.md` first. Preserve existing changes. Inspect the PR, all seven GitHub checks, CodeRabbit threads and exact Vercel deployment commit. Fix actionable findings, rerun `npm run check`, `npm run test:e2e`, `npm run agents:check`, then verify landing, demo login, the golden workflow, 404 and browser console on both Preview and Production. Record exact URLs, commits, CI/review/branch-protection state and honest residuals in README, Deployment, Self Evaluation and this handoff. Do not enable Supabase or TERRAST API mode or imply JPX approval without authorized external contracts.
