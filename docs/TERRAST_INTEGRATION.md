# TERRAST Integration Design

## 1. Confirmed boundary

No authorized TERRAST production API specification, endpoint, authentication scheme, payload, rate limit, SLA, or sandbox credential has been supplied. This repository therefore implements a connector contract, synthetic mock behavior, validated CSV/JSON import, and a fail-closed API skeleton. Nothing in this document is a statement about an existing TERRAST endpoint.

`TERRAST_CONNECTOR_MODE` is reserved for the future server command and does not switch the current client-side Sync Center, which explicitly uses Mock. API mode must not be wired or enabled in a shared environment until the unknowns in section 11 are resolved and contract tests are approved.

## 2. Connector contract

The application-facing contract is provider-neutral. The following TypeScript is a design contract; the installed implementation is the source of truth for exact import paths.

```ts
type ConnectorMode = "mock" | "api" | "csv_import" | "json_import";

type TerrastQuery = {
  companyCode: string;
  reportingPeriods?: readonly string[];
  metricCodes?: readonly string[];
};

type TerrastFetchResult = {
  records: TerrastMetricRecord[];
  fetchedAt: string;
  connector: ConnectorMode;
  sourceLabel: string;
};

interface TerrastConnector {
  readonly mode: ConnectorMode;
  fetchCompanyData(
    query: TerrastQuery,
    signal?: AbortSignal,
  ): Promise<TerrastFetchResult>;
}
```

Implementations:

- `MockTerrastConnector`: deterministic, synthetic, versioned fixtures. It identifies provenance as `terrast_mock` and never loads a production dump.
- `CsvJsonImportConnector`: parses user-provided files, validates an explicitly documented import schema, and emits normalized connector records.
- `ApiTerrastConnector`: validates server-only configuration, then currently returns an `unconfigured`/fail-closed result. It contains no guessed path or payload.

## 3. Authentication replacement point

Authentication belongs inside a server-only transport injected into `ApiTerrastConnector`, not in domain or UI code. The future adapter should accept an `AuthProvider` or request signer capable of adding the approved credential mechanism immediately before transport.

Until the real contract is known:

- `TERRAST_API_KEY` is server-only and may not be prefixed `NEXT_PUBLIC_`;
- credentials must never be persisted in connector records, sync errors, audit payloads, or browser state;
- base URL must be allowlisted and HTTPS-only outside local testing;
- redirects to a different origin must be rejected;
- provider response bodies must be bounded and redacted before logging.

Potential mechanisms such as OAuth, mTLS, HMAC, or static API keys are unknown and must not be selected by assumption.

## 4. Field mapping

Mapping is explicit and versioned in `requirement_mappings`, not hard-coded in a component. A mapping connects:

`provider field → metric_code → normalization rule → disclosure requirement`

Each rule records a mapping version and may specify unit conversion, enumeration mapping, aggregation, or validation. Raw/original value and unit remain alongside normalized value and canonical unit. Unsupported fields are reported as unmapped; they are not silently discarded or coerced.

The seed uses illustrative names such as `ghg.scope1.total`. These are mock field identifiers only and do not assert a real TERRAST schema.

## 5. Sync lifecycle

The numbered lifecycle below is the Supabase production target. In the implemented Demo Mode, the Sync Center calls `MockTerrastConnector`, validates normalized records, computes the four applicable classifications (`added`, `updated`, `conflict`, `unchanged`), and persists apply/idempotency output through `DemoRepository`; browser workspace state remains the presentation model. CSV/JSON import connectors are library-tested but are not exposed as a file-picker in this screen. Invalid import rows are rejected by connector validation rather than displayed as a fifth preview class.

1. **Authorize:** verify session, active membership, company ownership, and preparer/admin permission.
2. **Validate:** Zod-validate company, period, requested fields, mode, and idempotency key.
3. **Fetch:** connector returns bounded pages of normalized records plus provenance.
4. **Map:** apply the selected mapping version and unit rules.
5. **Validate records:** check type, period, unit, boundary, unique source ID, and allowed metric.
6. **Diff:** compare with the current metric value and latest source record.
7. **Dry-run:** persist a preview job and records without mutating metric values (production target; Demo preview is browser state).
8. **Resolve:** select changes and resolve every conflict. A manual choice requires a non-empty reason.
9. **Apply:** transactionally upsert selected values, link sync records, and append audit events.
10. **Report:** return counts, safe errors, applied IDs, mapping version, and audit IDs.

## 6. Diff rules

| Classification | Rule                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `added`        | no current value for the metric/company/period/source identity                                        |
| `unchanged`    | normalized value, unit, period, scope, and material metadata match                                    |
| `updated`      | current value was connector-sourced and incoming normalized content changed without a manual conflict |
| `conflict`     | a manual/approved value differs, provenance ownership is ambiguous, or boundaries differ materially   |
| `invalid`      | schema, metric, unit, period, mapping, or source identity validation fails                            |

Comparisons use canonical representations: decimal-safe numeric parsing, explicit unit conversion, stable key ordering for JSON, and timestamps excluded from semantic equality.

## 7. Idempotency and concurrency

The first two guarantees are implemented in the domain/DemoRepository path. Database re-read, stale-preview rejection, linked retry jobs, and transactional audit writes are production-command requirements represented by the schema but not yet wired end to end.

- Client/server generate a stable key for one logical command; the database enforces uniqueness on `(organization_id, idempotency_key)`.
- Repeating a completed command returns its recorded outcome. Repeating a running command returns its status. Reusing a key with a different request hash is rejected.
- Each source record is unique within a sync job, and metric upsert identity includes tenant, company, period, metric, source system, and source record ID.
- Apply re-reads current values and compares the preview version/hash. If data changed after preview, it becomes a new conflict rather than overwriting.
- A retry creates a linked job (`retry_of_job_id`) and uses a new command key; it does not mutate the failed job's history.

## 8. Conflict handling

The user chooses `terrast`, `manual`, or `skip`. Manual choice requires a reason and preserves both before/incoming values. Selecting TERRAST-like data does not delete the prior source; history remains in sync/audit records. Approved disclosures are not silently reopened: a material source change marks related work for review through an application event.

## 9. Errors and retry

Implemented connector errors are `CONFIGURATION_MISSING`, `API_CONTRACT_UNAVAILABLE`, `SECRET_IN_BROWSER`, `COMPANY_NOT_FOUND`, `IMPORT_PARSE_FAILED`, `IMPORT_VALIDATION_FAILED`, `REQUEST_ABORTED`, and `TRANSPORT_FAILED`. The future server command must map these to stable public errors with a correlation ID and no key, stack, provider body, database detail, or cross-tenant identifier.

Only bounded transient failures—timeouts, approved retryable status codes, and provider throttling—are retried with exponential backoff plus jitter and a cap. Validation, authorization, and configuration failures are not retried. The actual upstream error taxonomy cannot be finalized before the real API contract exists.

## 10. Data lineage

Every accepted record preserves source type/system/record ID, retrieval/import time, target period, source-document reference when allowed, original and normalized value/unit, consolidation scope, organizational boundary, confidence, verification status, mapping version, change reason, sync job/record IDs, and actor/audit time.

Source documents are referenced by private evidence metadata. Raw provider payloads are not retained by default; if future audit requirements need them, retention, encryption, consent, and data-minimization rules must be approved first.

## 11. Unknowns required for real API connection

- authoritative base URLs for sandbox and production;
- authentication/rotation/revocation mechanism and network allowlisting;
- company identifier semantics and authorization scope;
- endpoint/path list, methods, request/response schemas, content types, and size limits;
- field dictionary, null/deletion semantics, units, boundaries, periods, revisions, and source IDs;
- pagination, sorting, incremental cursor/watermark, concurrency, and replay rules;
- rate limits, quotas, timeout/SLA, maintenance windows, and retry headers;
- error contract and support/escalation path;
- webhook/event signing if change notifications exist;
- historical backfill and corrected-record behavior;
- data classification, residency, retention, deletion, DPA, audit, and subprocessor terms;
- ownership and licensing of derived fields, documents, and redisclosure;
- sandbox fixtures and contract-test approval process.

## 12. Go-live gate

API mode remains blocked until the unknowns are recorded in an approved interface-control document, a non-production credential is provisioned, contract/negative/rate-limit tests pass, threat modeling and privacy review are complete, secrets are stored in the deployment platform, and an operational rollback to mock/import mode is verified.
