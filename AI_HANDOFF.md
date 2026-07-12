# AI Handoff

## Cycle 4 — first Supabase production data slice

- **Cycle 4 release-evidence branch:** `agent/supabase-p0-release-evidence`
- **Cycle 4 implementation PR:** [#4](https://github.com/kotakase2022-jpg/gprnt/pull/4) — squash-merged through protected `main` as `cdff7bcd3122c2a1f80d98d42fa4355a78cc8027`
- **Cycle 4 release-evidence PR:** [#5](https://github.com/kotakase2022-jpg/gprnt/pull/5) — docs-only follow-up recording the already-verified runtime release; GitHub is authoritative for its lifecycle state
- **Implementation PR:** [#1](https://github.com/kotakase2022-jpg/gprnt/pull/1) merged to `main` as `5f22374`
- **Release evidence PR:** [#2](https://github.com/kotakase2022-jpg/gprnt/pull/2) merged to `main` as `9ce1843`
- **Cycle number:** 4 (explicitly resumed by the user after the completed three-cycle synthetic-demo release)
- **Status:** first production-readiness slice is merged and verified on public Production in Demo Mode; SQL apply/pgTAP/advisors and enabling Supabase mode remain blocked on a dedicated Supabase project
- **Evaluation:** 87 / 100; see `docs/SELF_EVALUATION.md`

### Improvement history

1. **Cycle 1 — initial MVP and demo comprehension:** built the Next.js foundation, original Japanese UI, full feature surface, synthetic data, responsive shell, landing value story and exact concept disclaimer.
2. **Cycle 2 — trust boundary:** added fail-closed runtime auth, route/action RBAC, company-isolated demo state, consent-aware operator aggregation, AI source authorization/evidence allow-list/provenance, CSV injection defense, server-owned database writes and Storage/RLS hardening. Independent audit moved the working score from 70 to 81.
3. **Cycle 3 — workflow and release proof:** closed role/state transition bypasses, approval editing, company/prompt provenance mismatches and public demo-AI text injection; made AI audit persistence atomic with correlation IDs; aligned OpenAPI/security docs; expanded negative unit/E2E checks.
4. **Cycle 4 — metric production slice:** added strict, non-fabricating Supabase row mappers and RLS-backed company/period/tenant-resolved catalog/value reads for `/app/data`; added a service-only, optimistic-locking manual metric RPC that preserves the exact effective role and stores redacted value/reason/scope/boundary hashes atomically; replaced stale JWT-only system-admin authorization with current membership verification; left all unreviewed non-AI operations and production export fail-closed.

### Completed items

- Landing, passwordless demo login, seven roles, role-aware navigation/deep-link denial, three isolated fictional companies and resettable local state.
- Dashboard, TERRAST Sync Center, metric data, disclosure workspace, GHG/Scope 3, Supplier, transition plan, grounded AI assistant, review/approval, operator, reports, marketplace, audit and settings screens.
- Mock connector, validated CSV/JSON import adapters, fail-closed API connector skeleton, mapping/diff/conflict/idempotency/provenance domain and DemoRepository transaction.
- Review → revision → resubmit → approval with role/state invariants and approved-draft edit lock; Supplier submit/revision/accept state guards.
- Supabase Auth guard now loads only RLS-visible companies. `SupabaseRepository` implements the reviewed company/reporting-period/metric slice with explicit PostgREST composite-FK hints and strict schema mappers; `/app/data` resolves selected-tenant definitions over global codes by immutable metric ID, preserves authorized historical values, and saves manual values through the audited server command. Every other non-AI operation and production CSV/export remains deliberately fail-closed.
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

- Migrations: `20260712100436_init_terrast_schema.sql`, `20260712143139_save_manual_metric_value_with_audit.sql`
- Static result: 31/31 public tables covered by the RLS loop; server-owned workflow, Storage and synthetic-seed guards passed.
- pgTAP definitions: 28 schema/security + 8 RLS isolation + 24 manual-command assertions (60 total) are plan-count consistent but remain unexecuted without Postgres/Docker or a dedicated remote project.
- AI provenance: `public.append_ai_generation_with_audit(...)` inserts the generation and audit event in one transaction, runs as `SECURITY INVOKER`, and is executable only by `service_role`.
- Manual metric command: `public.save_manual_metric_value_with_audit(...)` is service-only/`SECURITY INVOKER`, receives the exact trusted role authorized by the route and locks that same active membership, validates organization/company/open-period/catalog/type/unit relationships, uses `manual:<metric UUID>` as stable identity, prevents non-manual overwrite, applies optimistic version checks, and writes value/reason/scope/boundary hashes plus the audit event atomically. A shared advisory-lock bucket limits successful writes to 30 per actor/organization/minute and the same transaction returns the strict saved-row response.
- System-admin reads require both trusted `app_metadata.role=system_admin` and an active database `system_admin` membership. Auth-user deletion preserves review comments with a nullable author reference; authenticated clients and service credentials cannot hard-delete application history, and append-only histories revoke UPDATE.
- Not applied to a remote project. Local Docker Desktop could not be started, so `supabase db reset`, `db lint` and pgTAP were not executed. This blocks Supabase-backed production mode, not the credential-free synthetic demo.
- Rollback: for an isolated unshared demo database use `supabase db reset`; shared environments require a reviewed forward/compensating migration and backup/PITR plan, never a destructive reset.

### Environment variable changes

- `.env.example` documents Demo Mode, Supabase public/server separation, optional OpenAI, future TERRAST adapter and AI rate limits.
- `SUPABASE_SECRET_KEY` is the preferred independently rotatable server key; `SUPABASE_SERVICE_ROLE_KEY` remains a legacy compatibility fallback. Neither is browser-visible.
- Vercel project `terrast-disclosure-hub` exists in `kotakase2022-jpgs-projects`, is linked to `kotakase2022-jpg/gprnt`, and has `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEMO_MODE=true`, `TERRAST_CONNECTOR_MODE=mock` for Development/Preview/Production.
- No Supabase/OpenAI/TERRAST secret is configured or committed. Evidence TTL/max-size settings are explicitly reserved until those server commands exist.

### Tests executed and results

- `npm run check`: passed — Prettier, ESLint with zero warnings, TypeScript strict, 24 files / 114 unit tests, two-migration Supabase static checks, Next.js production build.
- `npm run test:coverage`: passed — statements 70.39%, branches 68.75%, functions 61.87%, lines 71.81%; domain statements 86.74%.
- `npm run test:e2e`: passed — 3/3 Chromium tests. Golden scenario covers login, company selection, sync preview/apply/conflict, manual reason/scope/boundary persistence, AI draft, submit, revision, edit, resubmit, approval, approved edit lock, report and operator reflection; additional tests cover tablet layout, company isolation and denied role deep links.
- Cycle 3 historical evidence: the then-current 3/3 suite passed against `https://terrast-disclosure-85q5ks9uu-kotakase2022-jpgs-projects.vercel.app`. This is distinct from the Cycle 4 Preview evidence recorded on the next line.
- `PLAYWRIGHT_BASE_URL=https://terrast-disclosure-hub-git-ag-a16f5c-kotakase2022-jpgs-projects.vercel.app npm run test:e2e`: passed — Cycle 4 Preview 3/3, including the updated manual reason/scope/boundary provenance assertion, with no captured console/page errors.
- `PLAYWRIGHT_BASE_URL=https://terrast-disclosure-hub.vercel.app npm run test:e2e`: passed — Cycle 4 Production 3/3 after PR #4 merged; landing and Demo company-admin `/app/data` also reported zero browser-console and page errors.
- `npm run agents:check`: passed — `AGENTS.md` and `CLAUDE.md` are byte-identical.
- Build output: 20 route entries including dynamic `/api/ai/disclosure` and `/api/workspace/metric-values`; static generation completed for 22 pages/assets.
- `npm audit`: two moderate transitive advisories from Next.js's bundled PostCSS remain; npm's suggested force fix is a destructive Next.js downgrade and was not applied.

### Deployment / external state

- **Vercel Production URL:** https://terrast-disclosure-hub.vercel.app — PR #4 runtime deployment `dpl_9MEM7tHkW4WQQkpyBa4Z5u5Nw6kG` was READY for `githubCommitRef=main` / `githubCommitSha=cdff7bcd3122c2a1f80d98d42fa4355a78cc8027`; its unique URL is https://terrast-disclosure-qujsu0kd6-kotakase2022-jpgs-projects.vercel.app. Remote Playwright 3/3 and landing + Demo `/app/data` browser checks passed with zero console/page errors. The docs-only release-evidence merge may advance the deployment ID without changing runtime code.
- **Cycle 4 Vercel Preview URL:** https://terrast-disclosure-hub-git-ag-a16f5c-kotakase2022-jpgs-projects.vercel.app — final implementation head `e5a3910ad6a71d65b9d3c4aab7eefdba5b65f300` was READY as `dpl_FCzhk8jL4uz4fYwiFeJru2wa479S`; its unique URL is https://terrast-disclosure-8a840bcdz-kotakase2022-jpgs-projects.vercel.app. Remote Playwright 3/3 and landing + `/app/data` browser checks passed with zero console/page errors.
- **GitHub Cycle 4 PR URL:** https://github.com/kotakase2022-jpg/gprnt/pull/4 — MERGED as `cdff7bcd3122c2a1f80d98d42fa4355a78cc8027`
- **GitHub implementation PR URL:** https://github.com/kotakase2022-jpg/gprnt/pull/1 — MERGED
- **GitHub release-evidence PR URL:** https://github.com/kotakase2022-jpg/gprnt/pull/2 — MERGED
- **Vercel project/Git integration/non-secret Demo env:** configured
- **Remote Supabase:** not created or applied
- **GitHub CI:** all seven required jobs passed on final Cycle 4 PR #4 head `e5a3910ad6a71d65b9d3c4aab7eefdba5b65f300`: `lint`, `typecheck`, `unit-test`, `build`, `e2e-smoke`, `agents-sync`, `db-static`; Vercel and Preview Comments checks also passed. Historical PR #1/#2 checks remain documented in their PRs.
- **Branch protection:** active and API-verified — PR required for admins, strict seven checks, conversation resolution, stale-review dismissal, force push/deletion blocked; approvals remain zero for the documented single-maintainer bootstrap.

### External review status

- Independent Codex subagents performed two passes of security and release-diff audits. Findings fixed before publication include effective-role substitution, post-commit ambiguous failure, mutable manual identity, tenant/global catalog collision, historical-value hiding, PostgREST FK ambiguity, missing reason/scope/boundary audit provenance, unsafe scalar coercion, invented provenance fallback, Auth-delete history cascade, closed/no-catalog dead actions, tenant form-state leakage, Demo provenance loss, and unaudited production CSV exposure.
- Claude Code `2.1.207` was re-invoked for the Cycle 4 diff through the official `@anthropic-ai/claude-code` package after the shared-rule prompt, but independent review could not run because it returned `Not logged in · Please run /login`. Do not claim Claude review completed.
- CodeRabbit: `@coderabbitai review` was requested on PR #4 at https://github.com/kotakase2022-jpg/gprnt/pull/4#issuecomment-4951847075; no response, review thread or inline comment existed at the final pre-merge inspection, so no CodeRabbit review is claimed.
- Cursor Bugbot: its installed GitHub integration attempted PR #4 automatically but reported `usage limit reached`, so it supplied no review finding.

### Unresolved items

- **Production-mode P0:** apply both migrations to a dedicated isolated Supabase project; run the positive/negative RLS, Storage and manual-command pgTAP suites plus security/performance advisors. No matching project currently exists in the connected account, and unrelated projects were intentionally left untouched.
- The implemented schema adapter covers only company/reporting-period/metric reads and manual metric writes. Sync, disclosure/review, consent, evidence, supplier, transition, export and invitation mutations remain fail-closed until each has a command-oriented atomic adapter.
- TERRAST real API specification, auth, endpoint, payload, field ownership, rate limit, SLA and sandbox remain unknown. API mode stays fail-closed.
- Supplier demo URL is presentation-only. Real token redemption/expiry/rotation/identity binding and evidence signed-URL/upload server commands are not wired.
- Production factors/taxonomy licensing, legal wording, consent, retention/deletion, malware scanning, SSO/SCIM, route-wide abuse controls/WAF beyond the manual-metric database limiter, observability and operating ownership remain gates.
- JPX has not approved, provided or partnered on this product. Every major screen must retain the exact concept disclaimer.

### Next priorities

- **P0:** provision or designate a dedicated isolated Supabase project with explicit user/cost approval, apply both migrations, load synthetic seed, generate current TypeScript database types, and record pgTAP/db-lint/advisor results. Do not use any unrelated existing project.
- **P1:** add command-oriented sync and disclosure/review adapters, then consent/evidence/supplier/transition/export/invitation commands; keep direct audited-field writes revoked.
- **P2:** implement a real TERRAST connector only after an approved interface-control document and sandbox credentials exist; complete enterprise security/governance/operations.

### Claude Code review focus

- Read `AGENTS.md` and `CLAUDE.md` first and verify byte identity.
- Review `src/domain/disclosure-workflow.ts`, `src/components/demo/demo-workspace.tsx` and the SQL server-owned workflow boundary for role/state/content mutation consistency.
- Review `src/app/api/ai/disclosure/route.ts`, `src/lib/ai/schema.ts` and the atomic RPC for source authorization, text injection, evidence allow-list, correlation/audit behavior and fail-closed errors.
- Review `src/app/api/workspace/metric-values/route.ts`, `src/lib/repositories/supabase-{schema-adapter,mappers,metric-command}.ts` and `20260712143139_save_manual_metric_value_with_audit.sql` for route/RPC authorization parity, optimistic locking, value-type/unit mapping, safe audit hashes and service-key isolation.

### Concrete prompt for the next AI

> Read `AGENTS.md`, `CLAUDE.md`, `AI_HANDOFF.md` and `docs/SELF_EVALUATION.md` first. Preserve Demo Mode and the reviewed `/app/data` Supabase slice. With explicit project/cost authorization, create or select only a dedicated isolated Supabase project, apply both migrations and synthetic seed, generate types, then run db lint, all pgTAP/RLS/Storage negative tests and both advisors. Fix findings before adding the next command-oriented sync or disclosure workflow slice. Do not enable TERRAST API mode or imply JPX approval without authorized contracts.
