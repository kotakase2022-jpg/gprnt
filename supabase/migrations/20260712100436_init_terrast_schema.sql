-- TERRAST Sustainability Disclosure Hub
-- Initial multi-tenant schema, least-privilege RLS, and private evidence storage.
-- The public schema is exposed by Supabase's Data API, so every public table
-- created here has RLS enabled before privileges are granted.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum (
  'system_admin',
  'platform_operator_demo_admin',
  'company_admin',
  'preparer',
  'reviewer_approver',
  'external_assurer_read_only',
  'supplier_user'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default gen_random_uuid() unique,
  name text not null,
  slug text not null unique,
  organization_type text not null check (
    organization_type in (
      'company', 'platform_operator', 'system_operator', 'assurance',
      'supplier', 'sustainable_lab'
    )
  ),
  locale text not null default 'ja-JP',
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_organization_id uuid references public.organizations(id) on delete set null,
  display_name text not null,
  locale text not null default 'ja-JP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_code text not null,
  legal_name text not null,
  name_en text,
  securities_code text,
  industry_code text,
  industry_category text not null check (
    industry_category in ('manufacturing', 'retail', 'information_services', 'other')
  ),
  industry_name text not null,
  market_segment text check (market_segment in ('demo_prime', 'demo_standard', 'demo_growth')),
  size_category text check (size_category in ('large', 'medium', 'small')),
  employee_band text,
  fiscal_year_end_month smallint not null default 3 check (fiscal_year_end_month between 1 and 12),
  terrast_external_id text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  unique (organization_id, company_code),
  unique (organization_id, terrast_external_id),
  unique (organization_id, securities_code)
);

create table public.company_sharing_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  grantee_organization_id uuid not null references public.organizations(id) on delete cascade,
  data_categories text[] not null default '{}',
  purpose text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'revoked', 'expired')),
  valid_from date,
  valid_until date,
  consented_by uuid references auth.users(id) on delete set null,
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grantee_organization_id <> organization_id),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  is_baseline boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, start_date, end_date),
  check (end_date >= start_date)
);

-- A null organization_id means a system-managed catalog row. Tenant-specific
-- extensions carry their owning organization_id and remain isolated by RLS.
create table public.frameworks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  publisher text not null,
  source_url text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, code)
);

create table public.framework_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  framework_id uuid not null references public.frameworks(id) on delete cascade,
  version_label text not null,
  effective_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded')),
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, version_label)
);

create table public.disclosure_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  framework_version_id uuid not null references public.framework_versions(id) on delete cascade,
  requirement_code text not null,
  short_summary text not null,
  data_fields jsonb not null default '[]'::jsonb,
  source_url text not null,
  applicable_from date,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_version_id, requirement_code)
);

create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  metric_code text not null,
  name text not null,
  category text not null,
  value_type text not null check (value_type in ('number', 'text', 'boolean', 'json')),
  canonical_unit text,
  description text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, metric_code)
);

create table public.requirement_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  requirement_id uuid not null references public.disclosure_requirements(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  terrast_field text,
  transformation_rule jsonb not null default '{}'::jsonb,
  mapping_version text not null default 'demo-v1',
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, requirement_id, metric_id)
);

create table public.metric_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete restrict,
  value_json jsonb not null,
  original_value text,
  normalized_value numeric,
  unit text,
  original_unit text,
  consolidation_scope text,
  organizational_boundary text,
  source_type text not null,
  source_system text not null,
  source_record_id text,
  source_document text,
  imported_at timestamptz,
  last_updated_at timestamptz not null default now(),
  confidence_level text not null default 'unknown' check (
    confidence_level in ('high', 'medium', 'low', 'unknown')
  ),
  verification_status text not null default 'unverified' check (
    verification_status in ('unverified', 'internally_reviewed', 'externally_assured')
  ),
  owner_user_id uuid references auth.users(id) on delete set null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (
    organization_id,
    company_id,
    reporting_period_id,
    metric_id,
    source_system,
    source_record_id
  )
);

create table public.emission_factors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  factor_code text not null,
  name text not null,
  factor_value numeric not null,
  numerator_unit text not null,
  denominator_unit text not null,
  factor_year integer not null,
  version_label text not null,
  source_url text,
  is_demo_data boolean not null default true,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, factor_code, factor_year, version_label)
);

create table public.calculation_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  output_metric_id uuid not null references public.metrics(id) on delete restrict,
  emission_factor_id uuid references public.emission_factors(id) on delete restrict,
  formula text not null,
  input_values jsonb not null,
  result_value numeric not null,
  result_unit text not null,
  calculation_method text not null,
  calculation_version text not null,
  calculated_by uuid references auth.users(id) on delete set null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_bucket text not null default 'evidence',
  object_path text not null,
  original_filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256 text not null,
  entity_type text not null,
  entity_id uuid not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'unverified' check (
    verification_status in ('unverified', 'internally_reviewed', 'externally_assured')
  ),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, object_path)
);

create table public.disclosure_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  requirement_id uuid not null references public.disclosure_requirements(id) on delete restrict,
  response_text text not null default '',
  structured_response jsonb not null default '{}'::jsonb,
  status text not null default 'not_started' check (
    status in (
      'not_started', 'data_available', 'drafted', 'in_review',
      'revision_requested', 'approved', 'not_applicable'
    )
  ),
  readiness_score numeric(5,2) not null default 0 check (readiness_score between 0 and 100),
  last_edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reporting_period_id, requirement_id)
);

create table public.disclosure_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  disclosure_response_id uuid not null references public.disclosure_responses(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content text not null,
  source_data_ids uuid[] not null default '{}',
  ai_generation_log_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (disclosure_response_id, version_number)
);

create table public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  assigned_to uuid references auth.users(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (
    status in ('open', 'in_review', 'revision_requested', 'approved', 'cancelled')
  ),
  due_at timestamptz,
  revision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_task_id uuid not null references public.review_tasks(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  mentioned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_task_id uuid not null references public.review_tasks(id) on delete cascade,
  disclosure_response_id uuid references public.disclosure_responses(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'revision_requested', 'revoked')),
  reason text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.risks_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  record_type text not null check (record_type in ('risk', 'opportunity')),
  risk_type text check (risk_type in ('physical', 'transition') or risk_type is null),
  title text not null,
  description text not null,
  likelihood integer not null check (likelihood between 1 and 5),
  impact integer not null check (impact between 1 and 5),
  time_horizon text not null check (time_horizon in ('short', 'medium', 'long')),
  affected_business text,
  financial_impact_direction text check (
    financial_impact_direction in ('positive', 'negative', 'mixed', 'unknown')
  ),
  response_strategy text,
  owner_user_id uuid references auth.users(id) on delete set null,
  governance_oversight text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transition_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete restrict,
  title text not null,
  baseline_year integer not null,
  target_year integer not null,
  baseline_value numeric,
  target_value numeric not null,
  unit text not null,
  progress_value numeric,
  status text not null default 'planned' check (
    status in ('planned', 'on_track', 'at_risk', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_year >= baseline_year)
);

create table public.transition_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  transition_target_id uuid references public.transition_targets(id) on delete cascade,
  risk_opportunity_id uuid references public.risks_opportunities(id) on delete set null,
  title text not null,
  description text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  kpi text,
  capex_amount numeric,
  opex_amount numeric,
  currency text default 'JPY',
  due_date date,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  status text not null default 'planned' check (
    status in ('planned', 'in_progress', 'blocked', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_name text not null,
  supplier_contact_email text,
  supplier_user_id uuid references auth.users(id) on delete set null,
  requested_metric_ids uuid[] not null default '{}',
  invitation_token_hint text,
  expires_at timestamptz not null,
  due_date date not null,
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'opened', 'submitted', 'revision_requested', 'accepted', 'expired')
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invitation token hashes use a dedicated service-only table. It is in public so
-- a server-side Supabase service client can reach it without exposing `private`;
-- authenticated/anon privileges are revoked and no client RLS policy exists.
create table public.supplier_invitation_secrets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_request_id uuid primary key references public.supplier_requests(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table public.supplier_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_request_id uuid not null references public.supplier_requests(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete restrict,
  value_json jsonb not null,
  unit text,
  evidence_file_ids uuid[] not null default '{}',
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'revision_requested', 'accepted')
  ),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_request_id, metric_id)
);

create table public.marketplace_offerings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  category text not null check (
    category in ('decarbonization', 'disclosure_support', 'assurance', 'education', 'green_finance', 'subsidy_support')
  ),
  name text not null,
  provider_name text not null,
  description text not null,
  matching_rules jsonb not null default '{}'::jsonb,
  is_synthetic boolean not null default true,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.terrast_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  connector_mode text not null check (connector_mode in ('mock', 'api', 'csv', 'json')),
  idempotency_key text not null,
  is_dry_run boolean not null default true,
  status text not null default 'pending' check (
    status in ('pending', 'running', 'preview_ready', 'completed', 'failed', 'cancelled')
  ),
  started_at timestamptz,
  completed_at timestamptz,
  retry_of_job_id uuid references public.terrast_sync_jobs(id) on delete set null,
  error_code text,
  error_message text,
  summary jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table public.terrast_sync_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_job_id uuid not null references public.terrast_sync_jobs(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete restrict,
  source_record_id text not null,
  change_type text not null check (change_type in ('added', 'updated', 'conflict', 'unchanged', 'invalid')),
  before_value jsonb,
  incoming_value jsonb,
  resolved_value jsonb,
  resolution text check (resolution in ('terrast', 'manual', 'skip') or resolution is null),
  resolution_reason text,
  applied_metric_value_id uuid references public.metric_values(id) on delete set null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (sync_job_id, source_record_id)
);

create table public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  disclosure_response_id uuid references public.disclosure_responses(id) on delete set null,
  prompt_version text not null,
  model text not null,
  input_hash text not null,
  permitted_source_ids uuid[] not null default '{}',
  output_json jsonb not null,
  status text not null check (status in ('completed', 'insufficient_evidence', 'validation_failed')),
  executed_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz not null default now()
);

alter table public.disclosure_drafts
  add constraint disclosure_drafts_ai_generation_log_id_fkey
  foreign key (ai_generation_log_id)
  references public.ai_generation_logs(id)
  on delete set null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

-- Composite foreign keys prevent a valid child organization_id from being
-- paired with a company/workflow entity owned by another tenant.
alter table public.companies
  add constraint companies_organization_id_id_key unique (organization_id, id);
alter table public.reporting_periods
  add constraint reporting_periods_organization_id_id_key unique (organization_id, id);
alter table public.disclosure_responses
  add constraint disclosure_responses_organization_id_id_key unique (organization_id, id);
alter table public.review_tasks
  add constraint review_tasks_organization_id_id_key unique (organization_id, id);
alter table public.risks_opportunities
  add constraint risks_opportunities_organization_id_id_key unique (organization_id, id);
alter table public.transition_targets
  add constraint transition_targets_organization_id_id_key unique (organization_id, id);
alter table public.supplier_requests
  add constraint supplier_requests_organization_id_id_key unique (organization_id, id);
alter table public.terrast_sync_jobs
  add constraint terrast_sync_jobs_organization_id_id_key unique (organization_id, id);

alter table public.company_sharing_consents
  add constraint company_sharing_consents_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.reporting_periods
  add constraint reporting_periods_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.metric_values
  add constraint metric_values_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id),
  add constraint metric_values_period_tenant_fkey
  foreign key (organization_id, reporting_period_id)
  references public.reporting_periods (organization_id, id);
alter table public.calculation_records
  add constraint calculation_records_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id),
  add constraint calculation_records_period_tenant_fkey
  foreign key (organization_id, reporting_period_id)
  references public.reporting_periods (organization_id, id);
alter table public.evidence_files
  add constraint evidence_files_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.disclosure_responses
  add constraint disclosure_responses_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id),
  add constraint disclosure_responses_period_tenant_fkey
  foreign key (organization_id, reporting_period_id)
  references public.reporting_periods (organization_id, id);
alter table public.disclosure_drafts
  add constraint disclosure_drafts_response_tenant_fkey
  foreign key (organization_id, disclosure_response_id)
  references public.disclosure_responses (organization_id, id);
alter table public.review_comments
  add constraint review_comments_task_tenant_fkey
  foreign key (organization_id, review_task_id)
  references public.review_tasks (organization_id, id);
alter table public.approvals
  add constraint approvals_task_tenant_fkey
  foreign key (organization_id, review_task_id)
  references public.review_tasks (organization_id, id),
  add constraint approvals_response_tenant_fkey
  foreign key (organization_id, disclosure_response_id)
  references public.disclosure_responses (organization_id, id);
alter table public.risks_opportunities
  add constraint risks_opportunities_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.transition_targets
  add constraint transition_targets_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.transition_actions
  add constraint transition_actions_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id),
  add constraint transition_actions_target_tenant_fkey
  foreign key (organization_id, transition_target_id)
  references public.transition_targets (organization_id, id),
  add constraint transition_actions_risk_tenant_fkey
  foreign key (organization_id, risk_opportunity_id)
  references public.risks_opportunities (organization_id, id);
alter table public.supplier_requests
  add constraint supplier_requests_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.supplier_responses
  add constraint supplier_responses_request_tenant_fkey
  foreign key (organization_id, supplier_request_id)
  references public.supplier_requests (organization_id, id);
alter table public.supplier_invitation_secrets
  add constraint supplier_invitation_secrets_request_tenant_fkey
  foreign key (organization_id, supplier_request_id)
  references public.supplier_requests (organization_id, id);
alter table public.terrast_sync_jobs
  add constraint terrast_sync_jobs_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);
alter table public.terrast_sync_records
  add constraint terrast_sync_records_job_tenant_fkey
  foreign key (organization_id, sync_job_id)
  references public.terrast_sync_jobs (organization_id, id);
alter table public.ai_generation_logs
  add constraint ai_generation_logs_company_tenant_fkey
  foreign key (organization_id, company_id)
  references public.companies (organization_id, id);

-- RLS helpers live outside the exposed public schema. SECURITY DEFINER is used
-- only for membership lookups that would otherwise recurse through the
-- organization_members policy. Every function verifies auth.uid(), fixes its
-- search_path, and has PUBLIC/anon execution revoked below.
create or replace function private.is_non_anonymous_authenticated()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
$$;

create or replace function private.is_system_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_non_anonymous_authenticated()
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'system_admin'
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_non_anonymous_authenticated()
    and (
      private.is_system_admin()
      or exists (
        select 1
        from public.organization_members om
        where om.organization_id = target_organization_id
          and om.user_id = (select auth.uid())
          and om.is_active
          and om.role = any (allowed_roles)
      )
    )
$$;

create or replace function private.can_read_organization(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_org_role(
    target_organization_id,
    array['company_admin', 'preparer', 'reviewer_approver']::public.app_role[]
  )
$$;

create or replace function private.can_write_organization(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_org_role(
    target_organization_id,
    array['company_admin', 'preparer']::public.app_role[]
  )
$$;

create or replace function private.can_admin_organization(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_org_role(
    target_organization_id,
    array['company_admin']::public.app_role[]
  )
$$;

create or replace function private.can_review_organization(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_org_role(
    target_organization_id,
    array['company_admin', 'reviewer_approver']::public.app_role[]
  )
$$;

create or replace function private.can_read_company_summary(
  target_organization_id uuid,
  target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_organization(target_organization_id)
    or (
      private.is_non_anonymous_authenticated()
      and exists (
        select 1
        from public.company_sharing_consents consent
        join public.organization_members viewer
          on viewer.organization_id = consent.grantee_organization_id
        where consent.organization_id = target_organization_id
          and consent.company_id = target_company_id
          and viewer.user_id = (select auth.uid())
          and viewer.role = 'platform_operator_demo_admin'::public.app_role
          and viewer.is_active
          and consent.status = 'active'
          and 'company_summary' = any (consent.data_categories)
          and (consent.valid_from is null or consent.valid_from <= current_date)
          and (consent.valid_until is null or consent.valid_until >= current_date)
      )
    )
$$;

create or replace function private.has_assigned_assurance_access(
  target_organization_id uuid,
  target_entity_type text,
  target_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_non_anonymous_authenticated()
    and exists (
      select 1
      from public.organization_members om
      join public.review_tasks task
        on task.organization_id = om.organization_id
       and task.assigned_to = om.user_id
      where om.organization_id = target_organization_id
        and om.user_id = (select auth.uid())
        and om.role = 'external_assurer_read_only'::public.app_role
        and om.is_active
        and task.entity_type = target_entity_type
        and task.entity_id = target_entity_id
        and task.status not in ('cancelled')
    )
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.prevent_tenant_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger organizations_protect_tenant_id
before update on public.organizations
for each row execute function private.prevent_tenant_id_change();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'user_profiles', 'organization_members', 'companies',
    'company_sharing_consents', 'reporting_periods', 'frameworks',
    'framework_versions', 'disclosure_requirements', 'metrics',
    'requirement_mappings', 'metric_values', 'emission_factors',
    'disclosure_responses', 'review_tasks', 'review_comments',
    'risks_opportunities', 'transition_targets', 'transition_actions',
    'supplier_requests', 'supplier_responses', 'marketplace_offerings',
    'terrast_sync_jobs'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$$;

-- Enable and force RLS on every table in the exposed public schema.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_members', 'user_profiles', 'companies',
    'company_sharing_consents', 'reporting_periods', 'frameworks',
    'framework_versions', 'disclosure_requirements', 'requirement_mappings',
    'metrics', 'metric_values', 'emission_factors', 'calculation_records',
    'evidence_files', 'disclosure_responses', 'disclosure_drafts',
    'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
    'transition_targets', 'transition_actions', 'supplier_requests',
    'supplier_responses', 'supplier_invitation_secrets',
    'marketplace_offerings', 'terrast_sync_jobs',
    'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end
$$;

-- The anonymous Data API role receives no application-table privileges.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- RLS is complemented by table privileges: client-side hard deletion is denied
-- globally, and append-only/server-owned records cannot be mutated even if a
-- future policy is accidentally broadened.
revoke delete on all tables in schema public from authenticated;
revoke insert on
  public.organizations,
  public.calculation_records,
  public.metric_values,
  public.disclosure_responses,
  public.review_tasks,
  public.approvals,
  public.terrast_sync_jobs,
  public.terrast_sync_records,
  public.ai_generation_logs,
  public.audit_logs
from authenticated;
revoke all privileges on public.supplier_invitation_secrets from authenticated;
revoke update on
  public.calculation_records,
  public.metric_values,
  public.disclosure_responses,
  public.disclosure_drafts,
  public.review_tasks,
  public.review_comments,
  public.approvals,
  public.terrast_sync_jobs,
  public.terrast_sync_records,
  public.ai_generation_logs,
  public.audit_logs
from authenticated;

-- The service role is explicitly granted because current Supabase projects do
-- not auto-expose new SQL-created tables. It remains server-only and bypasses
-- RLS, so every application use must repeat authorization before access.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage on schema private to service_role;

-- Root tenant and identity policies.
create policy organizations_select on public.organizations
for select to authenticated
using (
  private.has_org_role(
    id,
    array[
      'system_admin', 'platform_operator_demo_admin', 'company_admin', 'preparer',
      'reviewer_approver', 'external_assurer_read_only', 'supplier_user'
    ]::public.app_role[]
  )
);

create policy organizations_update on public.organizations
for update to authenticated
using (private.can_admin_organization(id))
with check (private.can_admin_organization(id));

create policy user_profiles_select on public.user_profiles
for select to authenticated
using (
  private.is_non_anonymous_authenticated()
  and ((select auth.uid()) = id or private.is_system_admin())
);

create policy user_profiles_insert on public.user_profiles
for insert to authenticated
with check (private.is_non_anonymous_authenticated() and (select auth.uid()) = id);

create policy user_profiles_update on public.user_profiles
for update to authenticated
using (private.is_non_anonymous_authenticated() and (select auth.uid()) = id)
with check (private.is_non_anonymous_authenticated() and (select auth.uid()) = id);

create policy organization_members_select on public.organization_members
for select to authenticated
using (
  (private.is_non_anonymous_authenticated() and user_id = (select auth.uid()))
  or private.can_admin_organization(organization_id)
  or private.is_system_admin()
);

create policy organization_members_insert on public.organization_members
for insert to authenticated
with check (
  private.can_admin_organization(organization_id)
  and role in ('company_admin', 'preparer', 'reviewer_approver', 'external_assurer_read_only', 'supplier_user')
);

create policy organization_members_update on public.organization_members
for update to authenticated
using (private.can_admin_organization(organization_id))
with check (
  private.can_admin_organization(organization_id)
  and role in ('company_admin', 'preparer', 'reviewer_approver', 'external_assurer_read_only', 'supplier_user')
);

create policy organization_members_delete on public.organization_members
for delete to authenticated
using (
  private.can_admin_organization(organization_id)
  and role not in ('system_admin', 'platform_operator_demo_admin')
);

-- Company summary can cross a tenant boundary only under an active, scoped
-- consent. All detailed tenant data below remains same-tenant only.
create policy companies_select on public.companies
for select to authenticated
using (private.can_read_company_summary(organization_id, id));

create policy companies_insert on public.companies
for insert to authenticated
with check (private.can_admin_organization(organization_id));

create policy companies_update on public.companies
for update to authenticated
using (private.can_admin_organization(organization_id))
with check (private.can_admin_organization(organization_id));

create policy companies_delete on public.companies
for delete to authenticated
using (private.can_admin_organization(organization_id));

create policy sharing_consents_select on public.company_sharing_consents
for select to authenticated
using (
  private.can_admin_organization(organization_id)
  or private.has_org_role(
    grantee_organization_id,
    array['platform_operator_demo_admin']::public.app_role[]
  )
);

create policy sharing_consents_insert on public.company_sharing_consents
for insert to authenticated
with check (private.can_admin_organization(organization_id));

create policy sharing_consents_update on public.company_sharing_consents
for update to authenticated
using (private.can_admin_organization(organization_id))
with check (private.can_admin_organization(organization_id));

create policy sharing_consents_delete on public.company_sharing_consents
for delete to authenticated
using (private.can_admin_organization(organization_id));

-- System/global catalogs are readable by authenticated users. Only system
-- admins mutate global rows; tenant admins may mutate their tenant extensions.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'frameworks', 'framework_versions', 'disclosure_requirements',
    'requirement_mappings', 'metrics', 'emission_factors',
    'marketplace_offerings'
  ]
  loop
    execute format(
      'create policy %1$I_select on public.%1$I for select to authenticated using (organization_id is null or private.can_read_organization(organization_id))',
      table_name
    );
    execute format(
      'create policy %1$I_insert on public.%1$I for insert to authenticated with check ((organization_id is null and private.is_system_admin()) or (organization_id is not null and private.can_admin_organization(organization_id)))',
      table_name
    );
    execute format(
      'create policy %1$I_update on public.%1$I for update to authenticated using ((organization_id is null and private.is_system_admin()) or (organization_id is not null and private.can_admin_organization(organization_id))) with check ((organization_id is null and private.is_system_admin()) or (organization_id is not null and private.can_admin_organization(organization_id)))',
      table_name
    );
    execute format(
      'create policy %1$I_delete on public.%1$I for delete to authenticated using ((organization_id is null and private.is_system_admin()) or (organization_id is not null and private.can_admin_organization(organization_id)))',
      table_name
    );
  end loop;
end
$$;

-- Standard tenant workflow tables. UPDATE always has both USING and WITH CHECK;
-- a SELECT policy is also present as required by PostgreSQL RLS semantics.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'reporting_periods', 'evidence_files', 'risks_opportunities',
    'transition_targets', 'transition_actions'
  ]
  loop
    execute format(
      'create policy %1$I_select on public.%1$I for select to authenticated using (private.can_read_organization(organization_id))',
      table_name
    );
    execute format(
      'create policy %1$I_insert on public.%1$I for insert to authenticated with check (private.can_write_organization(organization_id))',
      table_name
    );
    execute format(
      'create policy %1$I_update on public.%1$I for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id))',
      table_name
    );
    execute format(
      'create policy %1$I_delete on public.%1$I for delete to authenticated using (private.can_admin_organization(organization_id))',
      table_name
    );
  end loop;
end
$$;

-- Metric provenance and disclosure workflow state are server-command owned.
-- Authenticated clients can read tenant rows, but table privileges plus the
-- absence of write policies prevent direct provenance/status forgery.
create policy metric_values_select on public.metric_values
for select to authenticated
using (private.can_read_organization(organization_id));

create policy disclosure_responses_select on public.disclosure_responses
for select to authenticated
using (private.can_read_organization(organization_id));

-- Calculation evidence and disclosure draft versions are append-only.
create policy calculation_records_select on public.calculation_records
for select to authenticated
using (private.can_read_organization(organization_id));

create policy calculation_records_insert on public.calculation_records
for insert to authenticated
with check (private.can_write_organization(organization_id));

create policy disclosure_drafts_select on public.disclosure_drafts
for select to authenticated
using (private.can_read_organization(organization_id));

create policy disclosure_drafts_insert on public.disclosure_drafts
for insert to authenticated
with check (private.can_write_organization(organization_id));

create policy calculation_records_assurer_select on public.calculation_records
for select to authenticated
using (
  private.has_assigned_assurance_access(
    organization_id,
    'calculation_record',
    id
  )
);

-- An external assurer sees only explicitly assigned response/evidence entities.
create policy disclosure_responses_assurer_select on public.disclosure_responses
for select to authenticated
using (
  private.has_assigned_assurance_access(
    organization_id,
    'disclosure_response',
    id
  )
);

create policy evidence_files_assurer_select on public.evidence_files
for select to authenticated
using (
  private.has_assigned_assurance_access(organization_id, entity_type, entity_id)
);

-- Review and approval mutations are separated from preparation rights.
create policy review_tasks_select on public.review_tasks
for select to authenticated
using (
  private.can_read_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and assigned_to = (select auth.uid())
  )
);

-- Review-task creation and transitions are server-command owned. This prevents
-- an assignee from changing tenant, entity, assignment, or approval state via
-- the Data API; the domain transition service performs role/state validation.

create policy review_comments_select on public.review_comments
for select to authenticated
using (
  private.can_read_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and author_user_id = (select auth.uid())
  )
);

create policy review_comments_insert on public.review_comments
for insert to authenticated
with check (
  private.is_non_anonymous_authenticated()
  and author_user_id = (select auth.uid())
  and (
    private.can_read_organization(organization_id)
    or (
      private.has_org_role(
        organization_id,
        array['external_assurer_read_only']::public.app_role[]
      )
      and exists (
        select 1
        from public.review_tasks task
        where task.id = review_task_id
          and task.organization_id = organization_id
          and task.assigned_to = (select auth.uid())
          and task.status <> 'cancelled'
      )
    )
  )
);

-- Review comments are append-only from the Data API. Corrections and removals
-- use a validated server command so the original comment remains auditable.

create policy approvals_select on public.approvals
for select to authenticated
using (private.can_read_organization(organization_id));

create policy approvals_insert on public.approvals
for insert to authenticated
with check (
  approver_user_id = (select auth.uid())
  and private.can_review_organization(organization_id)
);

-- Approval history is append-only. Revocation is represented by a new row.

-- Supplier users can access only requests explicitly assigned to auth.uid().
create policy supplier_requests_select on public.supplier_requests
for select to authenticated
using (
  private.can_read_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and supplier_user_id = (select auth.uid())
    and expires_at > now()
  )
);

create policy supplier_requests_insert on public.supplier_requests
for insert to authenticated
with check (private.can_write_organization(organization_id));

create policy supplier_requests_update on public.supplier_requests
for update to authenticated
using (private.can_write_organization(organization_id))
with check (private.can_write_organization(organization_id));

create policy supplier_requests_delete on public.supplier_requests
for delete to authenticated
using (private.can_admin_organization(organization_id));

create policy supplier_responses_select on public.supplier_responses
for select to authenticated
using (
  private.can_read_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and exists (
      select 1
      from public.supplier_requests request
      where request.id = supplier_request_id
        and request.supplier_user_id = (select auth.uid())
        and request.expires_at > now()
        and metric_id = any (request.requested_metric_ids)
    )
  )
);

create policy supplier_responses_insert on public.supplier_responses
for insert to authenticated
with check (
  private.can_write_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and supplier_responses.status in ('draft', 'submitted')
    and exists (
      select 1
      from public.supplier_requests request
      where request.id = supplier_request_id
        and request.organization_id = organization_id
        and request.supplier_user_id = (select auth.uid())
        and request.expires_at > now()
        and request.status in ('sent', 'opened', 'revision_requested')
        and metric_id = any (request.requested_metric_ids)
    )
  )
);

create policy supplier_responses_update on public.supplier_responses
for update to authenticated
using (
  private.can_write_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and supplier_responses.status in ('draft', 'revision_requested')
    and exists (
      select 1
      from public.supplier_requests request
      where request.id = supplier_request_id
        and request.supplier_user_id = (select auth.uid())
        and request.expires_at > now()
        and request.status in ('sent', 'opened', 'revision_requested')
        and metric_id = any (request.requested_metric_ids)
    )
  )
)
with check (
  private.can_write_organization(organization_id)
  or (
    private.is_non_anonymous_authenticated()
    and supplier_responses.status in ('draft', 'submitted')
    and exists (
      select 1
      from public.supplier_requests request
      where request.id = supplier_request_id
        and request.organization_id = organization_id
        and request.supplier_user_id = (select auth.uid())
        and request.expires_at > now()
        and request.status in ('sent', 'opened', 'revision_requested')
        and metric_id = any (request.requested_metric_ids)
    )
  )
);

create policy supplier_responses_delete on public.supplier_responses
for delete to authenticated
using (private.can_admin_organization(organization_id));

-- Sync history and AI provenance are immutable except for job state changes.
create policy terrast_sync_jobs_select on public.terrast_sync_jobs
for select to authenticated
using (private.can_read_organization(organization_id));

create policy terrast_sync_jobs_insert on public.terrast_sync_jobs
for insert to authenticated
with check (private.can_write_organization(organization_id));

create policy terrast_sync_jobs_update on public.terrast_sync_jobs
for update to authenticated
using (private.can_write_organization(organization_id))
with check (private.can_write_organization(organization_id));

create policy terrast_sync_records_select on public.terrast_sync_records
for select to authenticated
using (private.can_read_organization(organization_id));

create policy terrast_sync_records_insert on public.terrast_sync_records
for insert to authenticated
with check (private.can_write_organization(organization_id));

create policy ai_generation_logs_select on public.ai_generation_logs
for select to authenticated
using (private.can_read_organization(organization_id));

create policy ai_generation_logs_insert on public.ai_generation_logs
for insert to authenticated
with check (
  private.can_write_organization(organization_id)
  and executed_by = (select auth.uid())
);

create policy audit_logs_select on public.audit_logs
for select to authenticated
using (private.can_admin_organization(organization_id) or private.is_system_admin());

-- Audit rows are server/trigger-written only; authenticated clients have no
-- INSERT/UPDATE/DELETE policy even though table privileges exist.

-- Supporting indexes include every organization_id used by RLS plus common
-- workflow and provenance lookups.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_members', 'companies', 'company_sharing_consents',
    'reporting_periods', 'frameworks', 'framework_versions',
    'disclosure_requirements', 'requirement_mappings', 'metrics',
    'metric_values', 'emission_factors', 'calculation_records',
    'evidence_files', 'disclosure_responses', 'disclosure_drafts',
    'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
    'transition_targets', 'transition_actions', 'supplier_requests',
    'supplier_responses', 'supplier_invitation_secrets',
    'marketplace_offerings', 'terrast_sync_jobs',
    'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
  ]
  loop
    execute format(
      'create index %1$I_organization_id_idx on public.%1$I (organization_id)',
      table_name
    );
  end loop;
end
$$;

create index organization_members_user_active_idx
  on public.organization_members (user_id, is_active, role);
create index metric_values_company_period_idx
  on public.metric_values (company_id, reporting_period_id, metric_id);
create index evidence_files_entity_idx
  on public.evidence_files (entity_type, entity_id) where deleted_at is null;
create index review_tasks_assignee_status_idx
  on public.review_tasks (assigned_to, status);
create index audit_logs_entity_created_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

-- Private evidence bucket. Signed URLs are generated server-side and are never
-- persisted. Object path: <organization_id>/<company_id>/<uuid>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  20971520,
  array[
    'application/pdf',
    'text/csv',
    'application/json',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'evidence'
  and private.is_non_anonymous_authenticated()
  and (
    private.is_system_admin()
    or exists (
      select 1
      from public.organization_members om
      where om.user_id = (select auth.uid())
        and om.is_active
        and om.role in ('company_admin', 'preparer', 'reviewer_approver')
        and om.organization_id::text = (storage.foldername(name))[1]
    )
    or exists (
      select 1
      from public.evidence_files evidence
      where evidence.storage_bucket = bucket_id
        and evidence.object_path = name
        and evidence.deleted_at is null
        and private.has_assigned_assurance_access(
          evidence.organization_id,
          evidence.entity_type,
          evidence.entity_id
        )
    )
  )
);

create policy evidence_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and private.is_non_anonymous_authenticated()
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.is_active
      and om.role in ('company_admin', 'preparer')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Storage upsert requires SELECT + INSERT + UPDATE. UPDATE checks both the old
-- row and new row, and only permits replacing an object owned by the caller.
create policy evidence_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'evidence'
  and private.is_non_anonymous_authenticated()
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.is_active
      and om.role in ('company_admin', 'preparer')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'evidence'
  and private.is_non_anonymous_authenticated()
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.is_active
      and om.role in ('company_admin', 'preparer')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- No authenticated DELETE policy is created. Evidence deletion must go through
-- a validated server command that authorizes the tenant/entity, soft-deletes
-- metadata, removes the object with a service client, and appends an audit row.

-- Lock down helper execution. app_metadata is the only JWT metadata consulted
-- for authorization; user_metadata is intentionally never trusted.
create or replace function public.append_ai_generation_with_audit(
  p_organization_id uuid,
  p_company_id uuid,
  p_prompt_version text,
  p_model text,
  p_input_hash text,
  p_permitted_source_ids uuid[],
  p_output_json jsonb,
  p_status text,
  p_executed_by uuid,
  p_actor_role text,
  p_executed_at timestamptz,
  p_request_id text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  generation_id uuid;
begin
  if p_status not in ('completed', 'insufficient_evidence', 'validation_failed') then
    raise exception 'invalid ai generation status';
  end if;

  insert into public.ai_generation_logs (
    organization_id, company_id, prompt_version, model, input_hash,
    permitted_source_ids, output_json, status, executed_by, executed_at
  ) values (
    p_organization_id, p_company_id, p_prompt_version, p_model, p_input_hash,
    p_permitted_source_ids, p_output_json, p_status, p_executed_by, p_executed_at
  )
  returning id into generation_id;

  insert into public.audit_logs (
    organization_id, actor_user_id, actor_role, action, entity_type,
    entity_id, after_state, request_id
  ) values (
    p_organization_id, p_executed_by, p_actor_role,
    'ai.disclosure.generated', 'ai_generation_log', generation_id,
    jsonb_build_object('status', p_status, 'input_hash', p_input_hash),
    p_request_id
  );

  return generation_id;
end;
$$;

revoke all on function public.append_ai_generation_with_audit(
  uuid, uuid, text, text, text, uuid[], jsonb, text, uuid, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.append_ai_generation_with_audit(
  uuid, uuid, text, text, text, uuid[], jsonb, text, uuid, text, timestamptz, text
) to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_non_anonymous_authenticated() to authenticated;
grant execute on function private.is_system_admin() to authenticated;
grant execute on function private.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function private.can_read_organization(uuid) to authenticated;
grant execute on function private.can_write_organization(uuid) to authenticated;
grant execute on function private.can_admin_organization(uuid) to authenticated;
grant execute on function private.can_review_organization(uuid) to authenticated;
grant execute on function private.can_read_company_summary(uuid, uuid) to authenticated;
grant execute on function private.has_assigned_assurance_access(uuid, text, uuid) to authenticated;
grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.prevent_tenant_id_change() to authenticated;
grant execute on all functions in schema private to service_role;

comment on schema private is
  'Non-exposed authorization helpers. Do not add private to Supabase exposed schemas.';
comment on table public.audit_logs is
  'Append-only audit events. Client writes are denied by RLS; use validated server-side commands.';
comment on table public.ai_generation_logs is
  'AI provenance: prompt version, model, input hash, permitted sources, output, actor and time.';
comment on column public.organizations.tenant_id is
  'Immutable security boundary identifier; child tables reference organization_id.';
