# Security and Data Governance

## 1. Scope and current posture

This document covers the concept MVP and its productionization requirements. Controls described in the migrations and application code are implemented locally; they have not been applied or verified against a remote Supabase project. Controls labeled **production gate** are not claimed as complete.

Primary assets are tenant sustainability data, evidence documents, supplier responses, user identity/roles, sharing consent, disclosure drafts/approvals, TERRAST connector credentials, OpenAI inputs/outputs, and audit/provenance history.

Primary threats include cross-tenant IDOR/BOLA, stale or forged role claims, service-role leakage, evidence URL leakage, malicious upload, supplier-token theft, consent bypass, AI data over-sharing, prompt/output fabrication, injection, SSRF through connector configuration, audit tampering, and secret leakage through logs/builds.

## 2. Tenant isolation and RLS

- `organizations.tenant_id` is immutable. Child records use a foreign-key `organization_id` checked on every command.
- Every table created in exposed `public` has RLS enabled and forced. `anon` has no application-table privileges.
- Authenticated clients have no hard-delete table privilege. The service role also has no DELETE privilege on application tables, except short-lived `supplier_invitation_secrets`, so it cannot erase history through parent cascades. Connector jobs/records, calculations, comments, AI provenance, and audit records are server-owned; append-only histories also revoke UPDATE. Administrative Auth-user deletion sets a review comment's author reference to null instead of cascading the comment. Retention/deletion/correction uses a separately reviewed privileged database workflow.
- Current Supabase projects do not automatically expose new SQL-created tables. The migration explicitly grants only the needed authenticated CRUD surface, explicitly grants server-only service access, then narrows immutable/secret operations; RLS still governs every authenticated row.
- Policies target `TO authenticated` and also check active membership/ownership. Authentication without ownership is never sufficient.
- UPDATE has a SELECT policy and both `USING` (old row) and `WITH CHECK` (new row), preventing tenant reassignment.
- RLS predicate columns are indexed. Global catalog rows are explicitly `organization_id IS NULL`; only system admins mutate them.
- Platform-operator company summary SELECT requires active, scoped, unexpired consent. Detailed tables stay tenant-only.
- Supplier access checks the assigned `auth.uid()`, request expiry, request organization, and metric request. External assurance reads require an active membership plus an explicitly assigned review entity.

RLS is defense in depth. Server routes repeat authentication, role, tenant, consent, entity, and action checks, particularly when using a service client or generating aggregates.

## 3. Authorization claims and sessions

`organization_members` is the role source of truth. The migration consults trusted `app_metadata.role` only for the coarse system-admin escape hatch. It never uses `user_metadata` / `raw_user_meta_data`, because users can edit those values.

JWT claims may remain stale until refresh. Role/consent changes therefore require token/session refresh; sensitive server operations re-query current membership and consent. Production should use short access-token lifetime appropriate to risk and revoke/sign out sessions during high-risk account removal or compromise response. Anonymous Supabase Auth users carry the `authenticated` database role; policies explicitly reject the `is_anonymous` claim for membership helpers.

## 4. Privileged database functions and service role

The few recursion-breaking membership/consent/assignment lookups that need `SECURITY DEFINER` are in non-exposed `private`, validate `auth.uid()`, set an empty `search_path`, reference qualified objects, and receive exact grants; other helpers use `SECURITY INVOKER`. Do not add `private` to Data API exposed schemas. The public atomic AI-provenance RPC and `save_manual_metric_value_with_audit` are `SECURITY INVOKER` and executable only by `service_role`; neither needs definer rights because that server credential already bypasses RLS.

The Supabase service role/secret key bypasses RLS. It is permitted only in server-only modules after normal user authentication and explicit authorization. New deployments prefer the independently rotatable `SUPABASE_SECRET_KEY`; `SUPABASE_SERVICE_ROLE_KEY` is a legacy compatibility fallback. Neither may appear in browser code, a `NEXT_PUBLIC_*` variable, telemetry, errors, screenshots, seed, or repository history. Prefer the user-scoped server client when RLS can perform the operation. Service-role hard deletion of application rows is revoked; invitation-hash rotation is the only current exception.

For the implemented manual metric command, the route first validates the bearer token with `getUser`, reads the trusted `app_metadata` role, and uses the user-scoped RLS client to re-query an active membership for that exact role, company tenancy, open reporting period, active metric, value type, and allowed unit. The service client is created only after those checks. The route passes the effective role to the RPC, which locks and rechecks the same active role membership plus company, open period and active metric rows; a different membership cannot silently elevate or replace it. The RPC locks a canonical `manual:<metric UUID>` row, enforces optimistic `expectedVersion`, prevents overwrite of non-manual provenance, and appends value/reason/scope/boundary hashes in the same transaction. A transaction-scoped advisory lock enforces 30 successful writes per actor and organization per minute across app instances. The RPC returns a complete safe saved-row payload from that transaction, the route validates it, and the adapter performs no post-commit enrichment query; a later reread cannot turn a successful commit into an apparent failure.

This is the only enabled non-AI privileged mutation. Every other non-AI repository mutation remains fail-closed.

## 5. Evidence Storage

- Bucket `evidence` is private; maximum object size is 20 MiB and the migration allowlists PDF, CSV, JSON, PNG, JPEG, and XLSX MIME types.
- Object key format is `<organization_id>/<company_id>/<random-id>/<sanitized-name>`.
- RLS limits SELECT to authorized organization staff or an explicitly assigned external assurer, INSERT to company admin/preparer under their organization folder, and UPDATE/upsert to caller-owned objects with SELECT+INSERT+UPDATE policies. Authenticated clients receive no DELETE policy; deletion uses a validated server command so metadata and audit history remain consistent.
- Database stores the object path and metadata, never a signed URL. A production server command must create a short-lived URL only after tenant/entity authorization; that command is an OpenAPI design contract and is not wired in the MVP. URLs must not be logged, cached publicly, or embedded in audit rows.
- Validate declared MIME, extension, magic bytes, size, dimensions/zip expansion, filename, and hash. Store with a generated object ID rather than a user-controlled path.
- **Production gate:** asynchronous malware scanning/quarantine, content-disarm policy where appropriate, scanning failure alerts, safe preview, and incident deletion/revocation procedure.

## 6. Sharing, aggregation, export, and deletion

Sharing consent records grantee organization, purpose, categories, effective dates, actor, and revocation. Consent is deny-by-default and evaluated at read time. Revocation stops future access; prior lawful exports require a separately approved retention policy.

Platform dashboards should query purpose-built aggregate/anonymous projections. Minimum cohort size, suppression of small cells, outlier handling, and re-identification review are **production gates**. A consented company summary never unlocks metric/evidence tables.

The Demo Mode report screen performs local print/CSV/JSON downloads and neutralizes CSV formulas; it contains only synthetic data. The Supabase `/app/data` screen does not expose its local CSV action. Production exports require an authorized server command, visible classification/watermark, audit event, bounded time range, and safe CSV handling. Deletion must coordinate database rows, Storage objects, backups, legal hold, audit retention, and downstream copies. Exact retention/deletion SLAs remain unconfirmed.

## 7. AI data governance

- AI calls run server-side. In Supabase mode the route ignores client-provided fact values, re-queries active company membership and every current/prior metric, requirement, and evidence ID through the caller's RLS context, then sends only that authoritative minimized packet. Public Demo Mode never calls the paid provider.
- Every output is structured and Zod-validated, labeled 「AI提案・要レビュー」, cites source IDs, and is rejected if any cited ID is outside the permitted input set. Unsupported content returns `insufficient_evidence`.
- Record prompt version, environment-selected model, input hash, permitted source IDs, validated output, actor, and time. Do not log raw secrets or unbounded evidence.
- Treat evidence text as untrusted data, not instructions. Delimit it, restrict tools, and never allow model output to select a tenant, authorize an action, approve a disclosure, or generate a signed URL.
- Provider retention, regional processing, model-training terms, DPA, sensitive-data policy, and customer opt-out are **production gates**. Deterministic demo output is used when no key is configured.

## 8. Input, errors, rate limiting, and invitations

- Zod validates the implemented AI route, manual metric command, import connectors, public Supabase configuration, schema adapter rows, and AI output; pure domain validators cover sync/calculation inputs. Future server actions must use the same boundary validation, with database checks as a second layer.
- The implemented AI and manual metric routes return stable codes and correlation IDs for public errors. Future routes must follow the same contract and never return stack traces, SQL/provider errors, key material, internal object paths, or another tenant's identifiers.
- The manual metric RPC implements a shared database limit of 30 successful writes per authenticated actor and organization per minute and returns stable HTTP 429 errors. Other routes still require limits by route risk, authenticated user, organization, and trusted network signal. **Production gate:** platform WAF/network abuse controls, dashboards, and tested fail behavior for AI, sync, export, login, invite, and signed-URL routes.
- The migration provides a service-only `supplier_invitation_secrets` table for future high-entropy, single-purpose, expiring token hashes. The current synthetic demo link is presentation-only and does not authenticate a supplier. Before real use, bind token redemption to request/status/expiry and optional identity, rotate after acceptance/revocation, and rate-limit attempts.

## 9. Secrets and configuration

Only `NEXT_PUBLIC_APP_NAME`, demo flag, Supabase URL, and Supabase publishable/legacy anon key are browser-visible. `SUPABASE_SECRET_KEY` (preferred), legacy `SUPABASE_SERVICE_ROLE_KEY`, OpenAI key, and TERRAST key are server secrets managed separately for Development, Preview, and Production. Preview must not inherit production data credentials by default.

Use deployment-platform secret storage, least-privilege provider credentials, documented rotation/revocation, and secret scanning. `TERRAST_API_BASE_URL` must be HTTPS and allowlisted before API mode to mitigate SSRF. `.env*` with real values and local Supabase temp artifacts must remain ignored.

## 10. Audit and monitoring

Audit approval/revocation, manual/TERRAST conflict resolution, evidence create/delete, AI generation, role change, consent change, export/delete request, supplier submission, and privileged administration. Store actor, action, entity, safe before/after state, request ID, and time. Hash or omit raw IP/user-agent when not necessary.

Client users cannot insert/update/delete `audit_logs`; validated server commands or controlled triggers append events. Operational logs are separate, access-controlled, redacted, time-synchronized, and retained per policy. **Production gate:** tamper-evident export/WORM strategy, alerting, SIEM integration, incident runbooks, and audit access reviews.

## 11. Secure delivery and operations

- Dependency versions and lockfile are committed; CI runs lint, typecheck, unit tests, build, E2E smoke, and AGENTS/CLAUDE sync.
- Protect `main` with required PR/check/conversation rules; block force push/deletion and dismiss stale approvals.
- Production deployment requires RLS positive/negative tests, Storage tests, secret review, migration/advisor review, backup/PITR verification, and rollback.
- Add security headers after testing compatibility: HSTS in production, `nosniff`, restrictive referrer policy, frame protection, permissions policy, and a nonce/hash-based CSP.
- **Production gates:** SSO/MFA policy, SCIM/JIT lifecycle, malware scanning, privacy/DPIA, external penetration test, third-party assurance integration, vulnerability/SBOM process, disaster-recovery exercise, and on-call ownership.

## 12. Required security tests

1. unauthenticated and anonymous-auth users receive no tenant rows;
2. Company A cannot select/insert/update/delete Company B records, including by changing `organization_id` on UPDATE;
3. reviewer/preparer/admin permissions differ as specified;
4. platform operator sees aggregates, no private detail, and only active consented summary;
5. consent expiry/revocation immediately denies summary access;
6. supplier token/user cannot access another request or metric;
7. external assurer sees only assigned entities;
8. evidence path traversal/wrong tenant/MIME/size/upsert/delete are rejected;
9. service-role server endpoints reject an authenticated but unauthorized user before data access;
10. AI requests exclude unauthorized evidence and invalid outputs do not persist;
11. audit/approval/sync/AI histories reject client mutation;
12. manual metric create/update rejects stale version, wrong tenant/period/metric/type/unit/effective role/non-manual provenance, keeps one UUID-stable row across a metric-code rename, returns the strict mapper payload, and writes exactly one redacted matching audit event;
13. Auth-user deletion preserves immutable review comments by nulling only the author reference;
14. secrets do not occur in browser bundles, errors, logs, or repository scans.

Unit/route tests and SQL pgTAP assertions for the first `/app/data` slice exist in the repository. The migrations, pgTAP suite, RLS/Storage negative tests, and database/security advisors have not been run against a remote Supabase project; this remains mandatory promotion evidence.

## 13. Supabase references reviewed

The migration design was checked on 2026-07-12 against the current Supabase [Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security), [API key guide](https://supabase.com/docs/guides/getting-started/api-keys), [Data API security guide](https://supabase.com/docs/guides/api/securing-your-api), [Storage access-control guide](https://supabase.com/docs/guides/storage/security/access-control), [Storage ownership guide](https://supabase.com/docs/guides/storage/security/ownership), [custom claims/RBAC guide](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac), and [breaking-change changelog](https://supabase.com/changelog?tags=breaking-change). The review accounts for explicit Data API grants on current projects and prefers current secret keys over legacy service-role JWTs. Recheck these sources and run database/security advisors before production migration because Supabase behavior evolves.
