# TERRAST Sustainability Disclosure Hub — AI Development Rules

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This repository may use a Next.js version with breaking API, convention, and file-structure changes. Before editing Next.js code, read the relevant guide under `node_modules/next/dist/docs/`, follow its current examples, and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product purpose

Build an operable concept MVP showing how listed companies could reuse synthetic TERRAST-like historical data, fill only missing information, prepare SSBJ/ISSB-oriented disclosures, collect Scope 3 data and evidence, review and approve drafts, build transition plans, export reports, and provide consent-controlled aggregate insight to a platform operator.

No fixed JPX disclaimer is required. Product copy must still follow the non-negotiable prohibitions below.

## Non-negotiable prohibitions

- Never state or imply that JPX has approved, endorsed, partnered on, or provides this product. No formal partnership currently exists.
- Never copy JPX, SGX, Gprnt, SSBJ, or ISSB logos, screens, prose, or standards text. Store only requirement IDs, short original summaries, mapped fields, source URLs, versions, effective dates, and status.
- Never invent a TERRAST production API, endpoint, payload, credential, SLA, or commercial condition. Keep the API connector as an explicit skeleton until an authorized specification is supplied.
- Never commit real TERRAST data, customer data, personal data, secrets, tokens, API keys, signed URLs, or production exports. All repository demo data must be fictional and labeled synthetic.
- Never describe readiness scores as legal compliance, certification, or assurance. Use 「開示準備度」「入力充足度」「証憑整備度」.
- Never ship a button that silently does nothing. Disable unavailable actions with a reason or implement the complete state change.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or `TERRAST_API_KEY` to client bundles, logs, errors, or `NEXT_PUBLIC_*` variables.

## Architecture principles

- Use Next.js App Router, React, strict TypeScript, Tailwind CSS, shadcn/ui-compatible composition, Zod, React Hook Form, Recharts, and Lucide icons.
- Keep domain logic framework-independent. Route handlers/server actions adapt validated inputs to application services; UI components do not query storage or privileged APIs directly.
- Access persistence through a repository boundary. `DemoRepository` must keep the core demo usable without Supabase; `SupabaseRepository` must preserve the same domain contract.
- Access TERRAST through `TerrastConnector`. Supported implementations are `MockTerrastConnector`, CSV/JSON import, and an inert `ApiTerrastConnector` skeleton. Mapping, diffing, conflict resolution, idempotency, and provenance belong outside the UI.
- Use server components by default and client components only for browser state or interaction. Read the repository's installed Next.js docs before using framework APIs.
- Keep calculations, readiness scores, permissions, AI validation, and marketplace matching deterministic and independently testable.
- Japanese is the primary UI language; structure copy for future localization. Target WCAG 2.1 AA, keyboard access, visible focus, semantic labels, and usable layouts at 1440px and tablet widths.

## Security principles

- Keep role IDs aligned across domain and database: `system_admin`, `platform_operator_demo_admin`, `company_admin`, `preparer`, `reviewer_approver`, `external_assurer_read_only`, and `supplier_user`.
- Treat `organizations.tenant_id` as the immutable security boundary and `organization_id` as the tenant key on child records. Verify tenant ownership on every server command and database query.
- Enable RLS on every table in an exposed Supabase schema. Policies must name the target role with `TO authenticated` and combine it with ownership/membership. `TO authenticated` alone is not authorization.
- Every UPDATE policy requires a SELECT policy plus both `USING` and `WITH CHECK`. Do not use `auth.role()`.
- Authorization is based on server-validated membership and trusted `app_metadata` only where required. Never use user-editable `user_metadata` for authorization. Account for JWT claim staleness when roles change.
- Keep any necessary `SECURITY DEFINER` helper in a non-exposed schema, set an empty/fixed `search_path`, verify `auth.uid()`, revoke PUBLIC execution, and grant only the exact function needed.
- The service role is server-only and bypasses RLS. Before using it, authenticate the user and repeat the authorization, tenant, consent, and resource checks in server code.
- Keep evidence in a private bucket. Persist object paths, not signed URLs; issue short-lived signed URLs after authorization. Validate MIME type, extension, size, and file signature. Malware scanning is a production gate.
- Platform operators receive aggregate/anonymous data by default. Individual company summaries require active, scoped, unexpired consent; non-public details remain inaccessible.
- Audit logs, approval history, TERRAST sync records, and AI generation logs are append-only. Redact secrets and sensitive payloads from errors and telemetry.
- Validate all external input with Zod, use generic client errors plus correlation IDs, apply per-user/per-tenant rate limits, and hash invitation tokens at rest.

## TERRAST data handling

- `MockTerrastConnector` uses only synthetic records and identifies them as `terrast_mock` / `MockTerrastConnector`.
- Preserve `source_type`, `source_system`, `source_record_id`, source document reference, retrieval/import time, reporting period, unit, original value/unit, normalized value, confidence, verification status, and change reason.
- Sync is dry-run first, idempotent by tenant plus idempotency key, and classifies `added`, `updated`, `conflict`, `unchanged`, and `invalid`.
- Manual values are never silently overwritten. A conflict requires an explicit resolution and a reason; every resolution produces an audit event.
- Do not enable API mode unless base URL, authentication scheme, payload schema, pagination, rate limits, error contract, deletion semantics, and field ownership are supplied and approved.

## AI output and evidence

- Run OpenAI calls on the server. The model is selected by `OPENAI_MODEL`; do not hard-code it.
- Validate structured output with Zod. When evidence is inadequate, return `insufficient_evidence` instead of creating facts.
- Mark all generated content 「AI提案・要レビュー」. AI must never assert compliance or assurance.
- Attach source data/evidence IDs to every generated statement. Record prompt version, model, input hash, permitted source IDs, validated output, actor, and execution time.
- Minimize and classify data before sending it to an external model. Do not send secrets, raw credentials, unrelated tenant records, or evidence files by default.
- With no API key, use deterministic demo output and preserve the same validation and provenance shape.

## Testing and quality gates

- Add or update tests with every behavior change. Unit-test GHG calculations, unit conversion, readiness/data-quality scoring, TERRAST diff/idempotency/conflict resolution, permissions, marketplace matching, and AI schema validation.
- Integration-test sync-to-metric persistence, requirement mapping, review/revision/approval, audit creation, and consent enforcement.
- Maintain a Playwright smoke path covering demo login, company selection, sync preview/execute, missing-data input, AI draft, review/revision/approval, report view, role switch, and platform aggregate update.
- Before handoff run, as applicable: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, and `npm run agents:check`.
- Do not mark work complete while a required CI check fails. Never claim a test, browser check, deployment, or security control ran when it did not.

## Git and pull request rules

- Never push directly to `main`. Work on a focused branch and use a pull request.
- Keep each PR to one coherent change. New features require tests.
- The PR body must include purpose, changes, tests and exact results, screenshots for UI changes, risks, security/tenant impact, migration notes, environment changes, and rollback steps.
- Required checks are `lint`, `typecheck`, `unit-test`, `build`, `e2e-smoke`, and `agents-sync`. Resolve review conversations and dismiss stale approvals after material changes.
- Review CodeRabbit findings. Fix them or document a reason in the PR. Use Cursor Bugbot only if CodeRabbit is insufficient. After Codex implementation, request an independent Claude Code review; Claude Code must read this file and `CLAUDE.md` first.
- Do not rewrite or discard unrelated user changes. Do not use destructive Git commands without explicit authorization.

## Definition of Done

Work is done only when the requested behavior is implemented end to end, important actions have real outcomes, authorization and tenant isolation are enforced, data provenance and audit events are present, demo mode works without secrets, relevant tests and build pass, accessibility and responsive behavior are checked, required docs and migrations are current, no secrets or real data are committed, `AGENTS.md` and `CLAUDE.md` are byte-identical, and `AI_HANDOFF.md` records evidence rather than claims.

Deployment is done only when the reported URL is accessible and verified. If GitHub or Vercel permissions are unavailable, leave exact commands and the precise blocker; do not report the external configuration as completed.

## AI_HANDOFF.md update rule

Update `AI_HANDOFF.md` in every PR and before the final handoff. Determine the next cycle number from the latest recorded cycle; never ask a human to choose it. Record the branch, target PR, completed items, changed files, DB migrations, environment changes, exact test commands/results, Vercel URLs, unresolved items, next P0/P1/P2 priorities, requested Claude review focus, and a concrete prompt for the next AI. Unknown or unexecuted fields must say `未実施` or `未確定`, not imply completion.
