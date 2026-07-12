# Branch Protection Runbook

## Current state

Active and API-verified on 2026-07-12 for `main`. Protection requires a PR for administrators, strict status checks, conversation resolution, and stale-review dismissal; force pushes and deletion are blocked. Required approvals are zero and Code Owner review is off only because the repository has one maintainer. Raise both when an independent maintainer is added.

Target branch: `main`
Repository: `kotakase2022-jpg/gprnt`

## Required policy

- Require a pull request before merging.
- Require zero approvals for this single-maintainer bootstrap so the author is not permanently blocked; raise to at least one independent human approval as soon as another maintainer is available.
- Dismiss stale approvals when new commits are pushed.
- Do not require Code Owner review while the only owner is the PR author; enable it with the first independent maintainer.
- Require conversation resolution before merging.
- Require branches to be up to date before merging.
- Require these exact status checks:
  - `lint`
  - `typecheck`
  - `unit-test`
  - `build`
  - `e2e-smoke`
  - `agents-sync`
  - `db-static`
- Block force pushes and branch deletion.
- Do not allow bypass except a documented break-glass owner; every bypass requires an incident/change record.
- Apply the rule to administrators when repository policy permits.

## GitHub UI procedure

1. Open repository **Settings → Rules → Rulesets → New branch ruleset**.
2. Name it `main-protection`, set enforcement to **Active**, and target the default branch or branch pattern `main`.
3. Enable **Restrict deletions**, **Block force pushes**, **Require a pull request before merging**, **Dismiss stale pull request approvals**, and **Require conversation resolution**. Leave required approvals at zero and Code Owner review off only for the documented single-maintainer bootstrap.
4. Enable **Require status checks to pass** and **Require branches to be up to date**.
5. First open a PR so GitHub has observed all CI job contexts, then select the seven exact checks above. Do not substitute a workflow-level display name that GitHub has not emitted.
6. Configure bypass actors only if an approved break-glass process exists.
7. Save the ruleset and verify it is shown as Active for `main`.

## Verification

Use a disposable PR or current feature PR and capture evidence:

1. Attempt to merge before checks finish: merge must be blocked.
2. Intentionally create an unresolved conversation: merge must remain blocked.
3. When an independent maintainer is added, raise approval count to one, obtain approval, push a material commit, and confirm approval is dismissed.
4. Confirm all seven job names are visible and required.
5. Confirm a normal collaborator cannot force-push or delete `main`.
6. Record the ruleset URL/screenshot and verification date in the PR and `AI_HANDOFF.md`.

Read-only CLI checks when authenticated:

```bash
gh repo view kotakase2022-jpg/gprnt --json defaultBranchRef
gh api repos/kotakase2022-jpg/gprnt/rulesets
gh pr checks <PR_NUMBER>
```

These commands inspect state; they do not prove enforcement until the negative merge tests pass.

## Rollback / emergency change

Do not disable the ruleset for a normal release. For a production incident, use a time-bounded, named bypass if available, record approver/reason/commit, open a follow-up PR, and restore/verify enforcement immediately. Never use a direct push merely to make CI green.
