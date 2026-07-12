# Deployment — Vercel and Supabase

## Current external status

The primary Vercel project `terrast-disclosure-hub-prod` was created through the authenticated Chrome dashboard in scope `kotakase2022-jpgs-projects` and connected to `kotakase2022-jpg/gprnt`. `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEMO_MODE=true`, and `TERRAST_CONNECTOR_MODE=mock` are configured for Production and Preview. Its stable alias is `https://terrast-disclosure-hub-prod.vercel.app`; initial deployment `dpl_DVRRZPMLecRhfkLVXzphqZE6dapC` for protected-main SHA `73543bb80fd6cdd5420cf6cd34d9ff4b828dd668` was READY and passed remote Playwright 3/3 with zero captured landing-page console errors. The earlier `terrast-disclosure-hub` project remains connected as a secondary deployment target.

No remote Supabase project was created or linked. The Vercel deployment intentionally runs the synthetic, deterministic Demo Mode and contains no customer data or server secrets.

## 1. Prerequisites

- a feature branch/PR for Preview; merge through required checks only before Production;
- supported Node version aligned across local, CI, `package.json`, and Vercel (CI currently uses Node 22);
- Vercel account/team with create/link and environment permissions;
- Supabase Development/Preview/Production projects for Supabase mode, or the approved synthetic demo-only decision used by this release;
- for Supabase mode, reviewed migration, RLS negative tests, and a rollback/restore plan;
- server secrets from approved owners—never copied into source control;
- `npm ci`, lint, typecheck, unit test, build, E2E smoke, and agents sync passing.

## 2. Environment matrix

| Variable                               | Browser? | Development                      | Preview                                | Production                          |
| -------------------------------------- | -------- | -------------------------------- | -------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_NAME`                 | yes      | same product name                | same                                   | same                                |
| `NEXT_PUBLIC_DEMO_MODE`                | yes      | `true` by default                | `true` until Supabase preview verified | explicit decision; never implicit   |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | local/dev                        | preview project                        | production project                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | matching project                 | matching preview                       | matching production                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | yes      | legacy fallback only             | legacy fallback only                   | remove when app no longer needs it  |
| `SUPABASE_SECRET_KEY`                  | no       | dev project, preferred           | preview project, preferred             | production project, server-only     |
| `SUPABASE_SERVICE_ROLE_KEY`            | no       | legacy fallback only             | legacy fallback only                   | remove after key migration          |
| `OPENAI_API_KEY`                       | no       | optional                         | optional/restricted                    | approved server key                 |
| `OPENAI_MODEL`                         | no       | blank for demo or approved model | approved value                         | approved value                      |
| `TERRAST_CONNECTOR_MODE`               | no       | `mock`                           | `mock`                                 | `mock` until real contract approved |
| `TERRAST_API_BASE_URL`                 | no       | blank                            | blank                                  | blank until approved                |
| `TERRAST_API_KEY`                      | no       | blank                            | blank                                  | blank until approved                |
| AI rate-limit values                   | no       | `.env.example` demo defaults     | reviewed; in-memory demo limiter       | distributed limiter before real use |
| evidence TTL/max-size values           | no       | reserved, not yet wired          | omit until commands exist              | production gate                     |

The publishable/legacy anon key is designed for browser use with RLS; neither server secret is. Prefer the independently rotatable `SUPABASE_SECRET_KEY`; retain `SUPABASE_SERVICE_ROLE_KEY` only as a temporary legacy fallback. Preview must not reuse production service/data credentials.

## 3. Supabase local verification and migration

Discover CLI options from the installed version before use:

```bash
supabase --version
supabase start --help
supabase db reset --help
supabase db lint --help
supabase db push --help
```

For an isolated local project:

```bash
supabase start
supabase db reset
supabase db lint --local
supabase test db supabase/tests --local
supabase migration list --local
```

Before a remote change, link to the exact non-production project, inspect the diff/list, take an approved backup, and apply through the reviewed workflow. Run Supabase database/security advisors after applying. Never point a local reset command at shared/production data.

The first production data-path slice is defined by `20260712143139_save_manual_metric_value_with_audit.sql` and `supabase/tests/manual_metric_command.test.sql`. It enables `/app/data` RLS reads plus the service-only atomic manual metric/audit command; all other non-AI mutations remain fail-closed. No remote project is linked, so migration application, pgTAP, RLS/Storage negative tests, and database/security advisors are **not run remotely**.

Seed SQL is synthetic and appropriate only for demo environments. Do not run it in a production customer tenant.

## 4. Vercel CLI sequence

Install/authenticate the current approved CLI outside application dependencies, then inspect help rather than guessing options:

```bash
vercel --version
vercel link --help
vercel env --help
vercel deploy --help
```

Link/create the project from the repository root:

```bash
vercel link
vercel env add NEXT_PUBLIC_APP_NAME
vercel env add NEXT_PUBLIC_DEMO_MODE
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SECRET_KEY
vercel env add OPENAI_API_KEY
vercel env add OPENAI_MODEL
vercel env add TERRAST_CONNECTOR_MODE
vercel env add TERRAST_API_BASE_URL
vercel env add TERRAST_API_KEY
```

Add each value to the intended Development/Preview/Production scopes. Blank optional secrets should normally be omitted rather than stored as fake values. Deploy Preview from the PR branch:

```bash
vercel
```

After review, merge through GitHub and let the Git integration deploy `main`. If an explicitly authorized manual production deploy is required:

```bash
vercel --prod
```

Do not run `--prod` until Preview verification and approval are recorded.

## 5. Preview verification

Record the exact URL and commit, then verify:

- landing and both working CTAs;
- no screen claims JPX approval, endorsement, partnership, provision, or data provenance;
- demo login and all role switches;
- golden TERRAST mock preview/apply/conflict/idempotency flow;
- disclosure, GHG, supplier, transition, AI/demo AI, review, audit, operator, print/CSV/JSON flows;
- direct deep-link refresh, unknown route 404, error boundary/500 behavior;
- no hydration, console, failed-resource, CSP, or mixed-content error;
- keyboard/focus/labels/contrast at desktop and tablet widths;
- no key, service-role code, signed URL, stack, or source map secret in browser/network output;
- for Supabase mode, `/app/data` RLS reads and authorized manual create/update including stale-version rejection;
- Supabase cross-tenant/RLS/Storage negative tests and advisors if Supabase mode is enabled.

## 6. Production promotion and rollback

Production requires the same commit that passed Preview, migration/advisor evidence, secret/config review, smoke test, monitoring owner, and rollback plan. Prefer application rollback/previous Vercel deployment for code. Database changes require a reviewed forward/compensating migration and backup/PITR strategy; do not use destructive reset/checkout commands on production.

After promotion, verify the public URL from a clean browser session and record Production/Preview URLs, commit, test results, migration version, and known limitations in `README.md`, the PR, and `AI_HANDOFF.md`.

## 7. Exact incomplete reason

Vercel project creation, repository connection, non-secret Demo Mode environment configuration, protected main merge, public Preview and Git-connected Production deployments, and browser verification are complete. The same remote Playwright suite passed 3/3 against both URLs, the custom 404 rendered, and the application emitted no captured console/page errors. The first Supabase production slice—`/app/data` RLS reads plus one service-only atomic manual metric/audit command—is implemented in code but is not part of a verified Supabase-mode deployment. No remote Supabase project or approved credentials were supplied; remote migration application, pgTAP, RLS/Storage tests, and advisors are unexecuted. All other non-AI mutations remain fail-closed. Configuration files alone are not treated as deployment evidence.
