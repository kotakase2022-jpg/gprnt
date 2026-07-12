# Deployment — Vercel and Supabase

## Current external status

The Vercel project `terrast-disclosure-hub` has been created in scope `kotakase2022-jpgs-projects`, linked to this workspace, and connected to `kotakase2022-jpg/gprnt`. `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEMO_MODE=true`, and `TERRAST_CONNECTOR_MODE=mock` are configured for Development, Preview, and Production. PR #1 has a public, verified Preview at `https://terrast-disclosure-85q5ks9uu-kotakase2022-jpgs-projects.vercel.app`; Vercel SSO deployment protection was disabled so external reviewers can reach the synthetic demo. The stable production alias `https://terrast-disclosure-hub.vercel.app` tracks the latest protected `main` deployment. The last explicitly inspected runtime deployment before the final handoff update was `dpl_9JgBUKyKsL9i4ign7qa6cDS7rk8C`, with Vercel API Git metadata `main` / `9ce1843b7d474a5512229e18836e14914c713fb3`; the alias passed remote Playwright 3/3 after that promotion. Later docs-only handoff commits may advance the deployment ID without changing runtime behavior.

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
| `SUPABASE_SERVICE_ROLE_KEY`            | no       | dev project                      | preview project                        | production project, server-only     |
| `OPENAI_API_KEY`                       | no       | optional                         | optional/restricted                    | approved server key                 |
| `OPENAI_MODEL`                         | no       | blank for demo or approved model | approved value                         | approved value                      |
| `TERRAST_CONNECTOR_MODE`               | no       | `mock`                           | `mock`                                 | `mock` until real contract approved |
| `TERRAST_API_BASE_URL`                 | no       | blank                            | blank                                  | blank until approved                |
| `TERRAST_API_KEY`                      | no       | blank                            | blank                                  | blank until approved                |
| AI rate-limit values                   | no       | `.env.example` demo defaults     | reviewed; in-memory demo limiter       | distributed limiter before real use |
| evidence TTL/max-size values           | no       | reserved, not yet wired          | omit until commands exist              | production gate                     |

The publishable/legacy anon key is designed for browser use with RLS; the service-role key is not. Preview must not reuse production service/data credentials.

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
vercel env add SUPABASE_SERVICE_ROLE_KEY
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
- concept disclaimer on every major screen;
- demo login and all role switches;
- golden TERRAST mock preview/apply/conflict/idempotency flow;
- disclosure, GHG, supplier, transition, AI/demo AI, review, audit, operator, print/CSV/JSON flows;
- direct deep-link refresh, unknown route 404, error boundary/500 behavior;
- no hydration, console, failed-resource, CSP, or mixed-content error;
- keyboard/focus/labels/contrast at desktop and tablet widths;
- no key, service-role code, signed URL, stack, or source map secret in browser/network output;
- Supabase cross-tenant/RLS/Storage negative tests if Supabase mode is enabled.

## 6. Production promotion and rollback

Production requires the same commit that passed Preview, migration/advisor evidence, secret/config review, smoke test, monitoring owner, and rollback plan. Prefer application rollback/previous Vercel deployment for code. Database changes require a reviewed forward/compensating migration and backup/PITR strategy; do not use destructive reset/checkout commands on production.

After promotion, verify the public URL from a clean browser session and record Production/Preview URLs, commit, test results, migration version, and known limitations in `README.md`, the PR, and `AI_HANDOFF.md`.

## 7. Exact incomplete reason

Vercel project creation, repository connection, non-secret Demo Mode environment configuration, protected main merge, public Preview and Git-connected Production deployments, and browser verification are complete. The same remote Playwright suite passed 3/3 against both URLs, the custom 404 rendered, and the application emitted no captured console/page errors. Supabase-backed production mode remains incomplete because no remote Supabase project or approved credentials were supplied, and the non-AI `SupabaseRepository` schema adapter/server commands are intentionally fail-closed. Configuration files alone are not treated as deployment evidence.
