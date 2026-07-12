import { readdirSync, readFileSync } from "node:fs";

const migrationDirectory = "supabase/migrations";
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

function readSql(file) {
  return readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
}

const migration = migrationFiles
  .map((file) => readSql(`${migrationDirectory}/${file}`))
  .join("\n");
const seed = readSql("supabase/seed.sql");

const requiredTables = [
  "organizations",
  "organization_members",
  "user_profiles",
  "companies",
  "company_sharing_consents",
  "reporting_periods",
  "frameworks",
  "framework_versions",
  "disclosure_requirements",
  "requirement_mappings",
  "metrics",
  "metric_values",
  "emission_factors",
  "calculation_records",
  "evidence_files",
  "disclosure_responses",
  "disclosure_drafts",
  "review_tasks",
  "review_comments",
  "approvals",
  "risks_opportunities",
  "transition_targets",
  "transition_actions",
  "supplier_requests",
  "supplier_responses",
  "supplier_invitation_secrets",
  "marketplace_offerings",
  "terrast_sync_jobs",
  "terrast_sync_records",
  "ai_generation_logs",
  "audit_logs",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const table of requiredTables) {
  assert(
    migration.includes(`create table public.${table}`),
    `Missing required table: ${table}`,
  );
}

const rlsSection = migration.slice(
  migration.indexOf("-- Enable and force RLS"),
  migration.indexOf("-- The anonymous Data API role"),
);
for (const table of requiredTables) {
  assert(rlsSection.includes(`'${table}'`), `RLS loop omits ${table}`);
}
assert(
  rlsSection.includes("enable row level security") &&
    rlsSection.includes("force row level security"),
  "RLS must be enabled and forced.",
);

const requiredSecurityFragments = [
  "private.is_non_anonymous_authenticated()",
  "grant execute on function private.is_non_anonymous_authenticated() to authenticated",
  "revoke all on all tables in schema public from anon",
  "revoke all privileges on public.supplier_invitation_secrets from authenticated",
  "supplier_responses.status in ('draft', 'submitted')",
  "private.has_assigned_assurance_access(",
  "No authenticated DELETE policy is created",
  "public.append_ai_generation_with_audit",
  "public.save_manual_metric_value_with_audit",
  "metric_values_version_positive",
  "metrics_metric_code_command_safe",
  "membership.role = 'system_admin'::public.app_role",
  "membership.role = v_actor_role",
  "p_actor_role text",
  "'metric_id', v_saved.metric_id",
  "consolidation_scope_hash",
  "change_reason_hash",
  "review_comments_author_user_id_fkey",
  "revoke delete on all tables in schema public from service_role",
  "revoke update on\n  public.audit_logs",
  "metric command rate limit exceeded",
];
for (const fragment of requiredSecurityFragments) {
  assert(migration.includes(fragment), `Missing security control: ${fragment}`);
}

for (const forbidden of [
  "create policy evidence_storage_delete",
  "create policy review_tasks_update",
  "create policy disclosure_responses_update",
  "auth.role()",
]) {
  assert(!migration.includes(forbidden), `Forbidden SQL pattern: ${forbidden}`);
}

for (const company of [
  "日本未来製造株式会社",
  "ネクストリテール株式会社",
  "グリーンテックサービス株式会社",
]) {
  assert(seed.includes(company), `Synthetic seed omits ${company}`);
}
assert(
  seed.includes("DEMO") || seed.includes("demo"),
  "Seed must identify itself as demo data.",
);

console.log(
  `Supabase static checks passed: ${migrationFiles.length} migrations, ${requiredTables.length}/${requiredTables.length} tables, RLS loop, audited metric command, Storage and synthetic seed guards.`,
);
