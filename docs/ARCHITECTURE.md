# Architecture

## 1. Architectural goals

The architecture makes the complete demo usable without external credentials while preserving production seams for Supabase, OpenAI, and a future authorized TERRAST API. Tenant separation, provenance, review history, and deterministic behavior are domain constraints rather than UI conventions.

## 2. System context

```mermaid
flowchart LR
  U["Company / reviewer / supplier / operator user"] --> N["Next.js application"]
  N --> D["DemoRepository<br/>synthetic local state"]
  N --> S["SupabaseRepository<br/>/app/data read + manual metric slice"]
  N --> C["TerrastConnector"]
  C --> M["Mock connector"]
  C --> I["CSV / JSON import"]
  C -. "disabled until contract supplied" .-> A["API connector skeleton"]
  N --> O["Server-side OpenAI adapter"]
  O --> X["Deterministic demo generator"]
  O -. "only with server key" .-> API["OpenAI API"]
```

The diagram does not assert a TERRAST endpoint or a JPX integration. JPX is a prospective stakeholder for the concept demonstration, not an integrated system.

## 3. Runtime layers

| Layer                | Responsibility                                                                             | Must not do                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| UI/routes            | rendering, input collection, navigation, accessible state feedback                         | decide tenant authorization, calculate business results ad hoc, use service-role credentials |
| Application services | orchestrate sync, disclosure, review, supplier, transition, AI, report use cases           | depend on React or browser-only APIs                                                         |
| Domain               | entities, status transitions, permission rules, calculations, scoring, diff/conflict logic | perform network/storage access                                                               |
| Ports                | repository, connector, AI generator, clock/ID abstractions                                 | encode provider-specific payloads in domain types                                            |
| Adapters             | DemoRepository, SupabaseRepository, mock/import/API connector, OpenAI/deterministic AI     | bypass validation or tenant checks                                                           |
| Infrastructure       | Supabase Auth/Postgres/Storage, Vercel runtime, observability/rate limit                   | expose secrets to the browser                                                                |

## 4. Operating modes

### Demo mode

`NEXT_PUBLIC_DEMO_MODE=true` selects a synthetic repository and deterministic AI output. State may persist in browser storage for the demo, but must be namespaced/versioned and resettable. Demo role switching is a presentation feature, not authentication. All records identify their synthetic source.

### Supabase mode

With valid Supabase public configuration and `NEXT_PUBLIC_DEMO_MODE=false`, the app uses Supabase Auth, rejects untrusted roles, hides demo role switching, and guards routes. The AI server route additionally re-queries company membership and every metric/evidence/requirement ID under the user's RLS context before any provider call; only then may a service client append AI/audit provenance.

The first non-AI production slice is implemented for `/app/data`. `SupabaseSchemaAdapter` reads companies, reporting periods, active typed metrics, metric values, and linked evidence IDs through the signed-in user's Data API client, so database RLS remains effective. PostgREST embeds use explicit composite-FK hints. The metric catalog is scoped to the selected company's organization plus global rows, tenant definitions override matching global codes, and database metric IDs keep values attached to that exact resolved definition. Its only enabled mutation is manual metric create/update through `POST /api/workspace/metric-values`; the browser never receives the server secret. Production CSV/export actions remain unavailable until an audited server command exists.

Every other non-AI repository mutation remains explicitly fail-closed. Authenticated mode is therefore a real-data metric slice, not a complete production workspace. No remote Supabase project was supplied, so the migration, pgTAP, RLS/Storage negative tests, and database/security advisors have not been run remotely.

### TERRAST connector modes

- `mock`: deterministic synthetic records.
- `csv` / `json`: validated import using the same normalized connector output.
- `api`: skeleton that fails closed until an authorized contract is configured.

## 5. Implemented manual metric command

```mermaid
sequenceDiagram
  participant UI as /app/data
  participant UserAPI as User-scoped Supabase client
  participant Route as POST /api/workspace/metric-values
  participant Service as Server secret client
  participant DB as save_manual_metric_value_with_audit

  UI->>UserAPI: RLS reads for period, metric and current value
  UI->>Route: Bearer JWT + strict input + expectedVersion
  Route->>UserAPI: getUser + membership/company/open-period/metric checks
  Route->>Service: initialize only after authorization
  Service->>DB: service-only SECURITY INVOKER RPC
  DB->>DB: recheck tenant/resources + lock/version + value write + audit insert
  DB-->>Route: complete safe saved row from the same transaction
  Route-->>UI: strict mapped row + correlationId
```

The route accepts only `system_admin`, `company_admin`, and `preparer` and passes the exact trusted role it authorized. The RPC locks and requires an active membership for that same effective role, rechecks every tenant/resource relationship, rejects non-manual overwrite and stale versions, and stores value/reason/scope/boundary hashes rather than raw values in the audit event. The adapter performs no post-commit enrichment query, so a successful commit cannot be reported as failed by a later reread. `SUPABASE_SECRET_KEY` is preferred; `SUPABASE_SERVICE_ROLE_KEY` is a temporary legacy fallback. The implementation exists in code but has not been applied or exercised against a remote Supabase project.

## 6. Core sync command flow (production target)

```mermaid
sequenceDiagram
  participant UI as Sync Center
  participant API as Server command
  participant Auth as AuthZ + Zod
  participant Conn as TerrastConnector
  participant Repo as Repository
  participant Audit as Audit log

  UI->>API: preview(company, period, idempotency key)
  API->>Auth: authenticate + tenant membership
  Auth-->>API: authorized context
  API->>Conn: fetch normalized records
  Conn-->>API: records + provenance
  API->>Repo: compare to current values
  Repo-->>API: added / updated / conflict / unchanged / invalid
  API-->>UI: dry-run preview
  UI->>API: apply(selected records + resolutions)
  API->>Auth: re-authorize + validate reasons
  API->>Repo: transactionally apply idempotency key
  API->>Audit: append changes and resolutions
  API-->>UI: committed summary + audit IDs
```

Demo Sync Center already calls `MockTerrastConnector`, the pure domain preview/apply logic, and `DemoRepository` transaction/idempotency persistence. The sequence above is the required Supabase implementation target; it is not yet fully wired for every non-AI command.

## 7. Authorization boundaries

- `tenant_id` is immutable on `organizations`; child rows carry `organization_id`.
- Database RLS is defense in depth for direct Data API access. It uses `TO authenticated` plus a membership/ownership predicate.
- Application authorization is mandatory even when using RLS, especially for service-role calls, field-level restrictions, aggregate queries, consent decisions, supplier invitations, and external-assurer assignments.
- Platform operator reads are separate: aggregate/anonymous projections are preferred, company summary requires active scoped consent, and detail tables remain same-tenant.
- Evidence uses object paths beginning with organization ID and a private bucket. The migration enforces Storage access; an authorized signed-URL server command is a production target and is not wired in this demo UI.

## 8. Data and consistency

- Repository commands write the domain record and audit event in one transaction where supported.
- Sync uses `(organization_id, idempotency_key)` uniqueness. Repeating the same successful request returns the prior result rather than duplicating metric values.
- Source records have stable connector IDs. Manual and connector values remain distinguishable.
- Approval, AI, sync-record, and audit histories are append-only. A reversal is a new event, not destructive editing.
- Timestamps are stored as `timestamptz`; reporting dates remain explicit `date` values. Display defaults to Asia/Tokyo.

## 9. AI boundary

Public Demo Mode always uses the deterministic generator, even if an API key is accidentally present. It allowlists demo task/label/unit vocabulary before producing prose so arbitrary client wording is not echoed as an endorsement. In authenticated mode, the server ignores client-provided facts: it verifies company membership, reloads current/prior metric values, requirement summary, and evidence IDs through RLS, hashes the authoritative packet, and rejects cross-company or missing IDs. OpenAI output is Zod-validated and every cited ID must be a subset of that permitted packet. Success, insufficient evidence, and validation/provider failure append AI provenance and an audit event atomically through a service-role-only, `SECURITY INVOKER` RPC after authorization. Provider errors never mutate an approved response.

## 10. Failure handling and observability

- Domain/validation errors return stable public codes and field issues.
- Unexpected errors return a generic message and correlation ID; stack traces and provider bodies stay server-side and are redacted.
- Connector timeouts/retriable failures mark jobs failed with a safe error code. Retry creates a linked job and reuses an explicit idempotency strategy.
- Audit logs record security-relevant actions; operational logs are separate and must not contain evidence payloads or secrets.
- Production should add structured traces, rate-limit telemetry, security alerts, backup/PITR monitoring, and retention controls.

## 11. Deployment topology

The current deployment target is a synthetic Demo Mode Next.js project on Vercel with no remote data credentials. The `/app/data` Supabase slice is implemented in the repository but is not deployed as a verified Supabase-mode environment. Promotion requires an approved Supabase region/project, reviewed migration application, pgTAP, RLS/Storage negative tests, advisors, environment review, and browser smoke testing. Preview deployments use synthetic or explicitly non-production data. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## 12. Architecture decisions

1. **Repository and connector ports:** preserve offline demo value and make provider replacement testable.
2. **No invented TERRAST contract:** API adapter is fail-closed until documented inputs exist.
3. **Postgres RLS plus server authorization:** neither browser role state nor `TO authenticated` is sufficient alone.
4. **Membership table as authorization source of truth:** trusted `app_metadata` is reserved for coarse system administration; `user_metadata` is never trusted.
5. **Private evidence bucket and ephemeral URL:** prevents long-lived access tokens from becoming records.
6. **Original requirement summaries:** avoids copying standards while retaining version/source traceability.
