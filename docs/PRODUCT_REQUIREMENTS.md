# Product Requirements — TERRAST Sustainability Disclosure Hub MVP

## 1. Positioning and status

This document defines the concept MVP as of 2026-07-12. The product demonstrates a possible operational foundation for Japanese listed-company sustainability disclosure. It is not a legal-compliance product, an assurance opinion, an official SSBJ/ISSB publication, or a JPX-provided service.

Required product disclaimer:

> JPX連携構想の検討用コンセプトMVPです。JPXによる承認・提供を示すものではありません。

The core proposition is to start from synthetic data shaped like historical TERRAST data, identify gaps, and ask a company to complete only the missing information. No real TERRAST API or customer data is part of this repository.

## 2. Problem and desired outcome

Japanese companies repeatedly collect similar environmental, human-capital, governance, and financial-context data across departments. Evidence, units, reporting boundaries, and review status are fragmented, making disclosure preparation hard to trace.

The MVP must prove one continuous workflow:

1. select a company and preview a TERRAST mock sync;
2. classify additions, updates, conflicts, unchanged records, and invalid records;
3. apply selected changes idempotently while preserving provenance;
4. identify missing disclosure inputs and collect evidence;
5. prepare SSBJ/ISSB-oriented original summaries and AI-assisted drafts;
6. review, return, revise, approve, and audit the work;
7. calculate GHG values and manage Scope 3 supplier requests;
8. connect risks and opportunities to transition targets and actions;
9. export readiness, gap, GHG, transition, provenance, and audit reports;
10. expose only aggregate, anonymous, or explicitly consented information to a platform operator.

## 3. Users and authorization outcomes

| Role                         | Allowed outcome                                                                | Explicit boundary                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Sustainable Lab System Admin | administer tenants, connectors, catalogs, mappings, and system audit           | privileged server workflow; not a browser-exposed service-role session |
| Platform Operator Demo Admin | view market-level aggregates and consented company summaries                   | cannot browse non-public company details by default                    |
| Company Admin                | manage own organization, users, roles, sharing consent, and company data       | cannot grant global system/platform privileges or cross tenants        |
| Preparer                     | enter data/evidence, resolve sync conflicts, prepare disclosure drafts, use AI | cannot approve own work solely by changing client state                |
| Reviewer / Approver          | comment, return, approve, revoke via a new decision record, view history       | cannot alter source provenance or audit history                        |
| External Assurer / Read Only | view explicitly assigned responses, evidence, and calculations                 | no blanket tenant access and no mutation                               |
| Supplier User                | answer only an assigned, unexpired Scope 3 request                             | no access to other suppliers or company workspace                      |

When Supabase configuration is absent, demo login can switch among representative roles using synthetic in-browser state. Demo identity is not equivalent to production authentication.

## 4. Functional requirements

### 4.1 Concept landing

- Explain the fragmented-data problem, repeated annual collection, initial population from TERRAST-like data, and the continuous disclosure/Scope 3/transition workflow within 30 seconds.
- Provide working CTAs for a listed-company demo and platform-operator demo.
- Present value separately for listed companies, a platform operator, investors, and financial institutions without suggesting a formal partnership.

### 4.2 Executive dashboard

- Show overall, SSBJ general, and SSBJ climate readiness; evidence coverage; review/approval progress; Scope 1/2/3 trends; Scope 3 category coverage; major risks/opportunities; transition action progress; peer aggregate; mock-sourced count; and company-input gap count.
- Every score has a details view showing numerator, denominator, weights, exclusions, freshness, and missing evidence. Scores are readiness indicators, not compliance determinations.

### 4.3 TERRAST Data Sync Center

- Select a company by demo company/securities code and show available fields, last sync, and provenance.
- Preview before applying. Classify `added`, `updated`, `conflict`, `unchanged`, and `invalid`.
- Let the user select records, resolve conflicts to TERRAST-like or manual values, and require a reason for manual override.
- Show source, retrieval date, target period, unit, confidence, and validation result.
- Support dry-run, tenant-scoped idempotency keys, retry of failed jobs, and immutable record history.
- Implement a connector boundary for mock, CSV, JSON, and a disabled API skeleton. Never assume a production endpoint.

### 4.4 Company and metric data

- Use one longitudinal model for environment, human capital, governance, GHG, energy, water, waste, diversity, employees, safety, supply chain, risk/opportunity, and target/performance data.
- Preserve metric code, period, value, original/normalized values, units, consolidation scope, organizational boundary, source, source record/document, import/update time, confidence, verification status, owner, reviewer, evidence, and change reason.

### 4.5 Disclosure workspace

- Version catalogs for SSBJ application/general/climate/practical themes and ISSB IFRS S1/S2-oriented demo requirements, with future framework extensibility.
- Store no standards prose beyond an original short summary. Each requirement shows mapped data, auto-filled content, gaps, evidence, owner, status, AI draft, comments, approval, last editor, and history.
- Statuses: Not Started, Data Available, Drafted, In Review, Revision Requested, Approved, Not Applicable.
- Offer a guided plain-language question flow that writes to the same validated response model.

### 4.6 GHG and Scope 3

- Calculate Scope 1 and 2 as activity data × emission factor; show inputs, formula, factor name/year/version, and result.
- Distinguish location/market methods, baseline/target years, trends, intensity, estimated/measured values, and all 15 Scope 3 categories.
- Show category materiality, coverage, supplier response, and data-quality score.
- All repository factors are visibly labeled `DEMO DATA` and must not be represented as official factors.

### 4.7 Supplier engagement

- Create a request, select metrics, set a due date, generate/copy a presentation-only demo link, collect synthetic values/evidence metadata, submit, return, accept, and show response rate.
- Email delivery is outside this MVP. Real supplier access requires the schema's service-only token-hash design plus a server redemption route, expiry/rotation and identity binding; it is a production gate, not a property of the demo URL.

### 4.8 Climate risk, opportunity, and transition plan

- Capture physical/transition risk or opportunity, likelihood, impact, horizon, business, financial direction, response, owner, governance, KPI, target, baseline/target year, progress, and CapEx/OpEx relation.
- Visualize current state → risks/opportunities → targets → actions → investment → KPI → progress.

### 4.9 AI Disclosure Assistant

- Generate a draft only from permitted metric/evidence IDs; surface missing questions, inconsistencies, risk/opportunity candidates, transition narrative, year-over-year changes, and weak-evidence warnings.
- Use server-side execution, environment-selected model, structured output, and Zod validation.
- Return `insufficient_evidence` when support is inadequate and label every output 「AI提案・要レビュー」.
- Record prompt version, model, input hash, permitted sources, validated output, executor, and time. Use deterministic output when no API key is configured.

### 4.10 Review, approval, and audit

- Support comments, responsible-person assignment, revision reasons, approval, append-only revocation, before/after diff, and searchable audit events.
- Audit manual/TERRAST decisions, evidence changes, AI generations, approvals, and sharing-consent changes.

### 4.11 Platform operator

- Aggregate participant count, demo market segment, industry readiness, general/climate progress, Scope 1/2/3 coverage, overdue work, pending reviews, common gaps, company-size readiness, transition-plan rate, quality distribution, and supplier response.
- Keep aggregate/anonymous data, consented summaries, and non-public details as distinct data products.

### 4.12 Report and marketplace

- Produce print-optimized HTML and browser PDF, CSV, and JSON for readiness, requirements, gaps, GHG, transition plan, provenance, and audit extracts.
- Marketplace contains only fictional offerings in decarbonization, disclosure support, assurance, education, green finance, and subsidy categories. Rank by deterministic rules and never invent real provider terms.

## 5. Demo data and golden scenario

The three companies are fictional:

- 日本未来製造株式会社: Scope 1/2 relatively complete; Scope 3 and transition gaps.
- ネクストリテール株式会社: many suppliers and low Scope 3 coverage.
- グリーンテックサービス株式会社: lower emissions and stronger human-capital data.

Each has at least three fiscal years of synthetic `MockTerrastConnector`-shaped data. The golden scenario uses 日本未来製造株式会社 to demonstrate preview → conflict resolution → apply → gap input → AI draft → return → revise → approve → report → platform aggregate.

## 6. Non-functional requirements

- Japanese-first copy with a localization-ready structure.
- WCAG 2.1 AA intent: keyboard operation, visible focus, semantic labels, contrast, non-color status cues, accessible charts/tables, reduced-motion handling.
- Primary viewport 1440px; no loss of function on tablet widths.
- Strict TypeScript, Zod at trust boundaries, deterministic domain functions, repository/connector boundaries, and server-side authorization.
- All exposed Supabase tables use RLS; evidence storage is private and accessed by short-lived signed URL.
- Generic client errors with correlation IDs; secrets and internal stack traces are not returned.
- Required quality gates: lint, typecheck, unit test, build, Playwright smoke, and AGENTS/CLAUDE byte equality.

## 7. MVP acceptance evidence

Acceptance requires an accessible verified deployment URL, demo login/role switching, a working golden scenario, all important buttons producing a real state change or explicit disabled reason, passing required checks, current handoff documentation, and evidence that no secrets or real data are committed. An unavailable external account is recorded as a blocker and is never reported as completed.

## 8. Out of scope until productionization

- A real TERRAST API connection or production SLA.
- A JPX partnership, endorsement, procurement decision, or production integration.
- Legal compliance determination or external assurance.
- Licensed full standards content.
- Production malware scanning, SSO/SCIM, DLP, e-discovery/legal hold, external assurance-provider integration, and regulated retention configuration.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md), [SECURITY.md](./SECURITY.md), and [ROADMAP.md](./ROADMAP.md) for the boundary between MVP and production.
