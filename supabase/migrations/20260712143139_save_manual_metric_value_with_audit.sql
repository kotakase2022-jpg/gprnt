-- First production data-path slice: RLS-backed metric reads and a single
-- service-only command that persists a manual value and its audit event in the
-- same transaction. All other non-AI mutations remain fail-closed.

alter table public.metrics
  add column if not exists allowed_units text[] not null default '{}',
  add column if not exists is_required boolean not null default false,
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists terrast_field_key text;

alter table public.metrics
  drop constraint if exists metrics_metric_code_command_safe;
alter table public.metrics
  add constraint metrics_metric_code_command_safe check (
    length(metric_code) between 1 and 100
    and metric_code ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  );

update public.metrics
set allowed_units = array[canonical_unit]
where canonical_unit is not null
  and cardinality(allowed_units) = 0;

alter table public.metric_values
  add column if not exists manual_override boolean not null default false,
  add column if not exists version integer not null default 1;

-- Preserve review history when an Auth identity is administratively removed.
-- The author UUID becomes unavailable, but the immutable comment remains.
alter table public.review_comments
  drop constraint if exists review_comments_author_user_id_fkey;
alter table public.review_comments
  alter column author_user_id drop not null;
alter table public.review_comments
  add constraint review_comments_author_user_id_fkey
  foreign key (author_user_id) references auth.users(id) on delete set null;

alter table public.metric_values
  drop constraint if exists metric_values_version_positive;

alter table public.metric_values
  add constraint metric_values_version_positive check (version > 0);

update public.metric_values
set manual_override = true
where source_type = 'manual';

-- A current database membership is required in addition to the coarse JWT
-- app_metadata claim. Revoking the membership therefore takes effect before a
-- previously issued JWT expires.
create or replace function private.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_non_anonymous_authenticated()
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'system_admin'
    and exists (
      select 1
      from public.organization_members membership
      where membership.user_id = (select auth.uid())
        and membership.role = 'system_admin'::public.app_role
        and membership.is_active
    )
$$;

revoke all on function private.is_system_admin() from public, anon, authenticated;
grant execute on function private.is_system_admin() to authenticated, service_role;

create or replace function public.save_manual_metric_value_with_audit(
  p_organization_id uuid,
  p_company_id uuid,
  p_reporting_period_id uuid,
  p_metric_id uuid,
  p_value_json jsonb,
  p_unit text,
  p_consolidation_scope text,
  p_organizational_boundary text,
  p_change_reason text,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_actor_role text,
  p_request_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_role public.app_role;
  v_metric public.metrics%rowtype;
  v_existing public.metric_values%rowtype;
  v_saved public.metric_values%rowtype;
  v_before_state jsonb;
  v_period_label text;
  v_value_type text;
  v_original_value text;
  v_normalized_value numeric;
  v_recent_command_count integer;
  v_source_record_id text;
begin
  if p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9._:-]{1,100}$' then
    raise exception 'invalid request id' using errcode = '22023';
  end if;

  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'invalid expected version' using errcode = '22023';
  end if;

  if p_change_reason is null
    or length(btrim(p_change_reason)) < 3
    or length(p_change_reason) > 500 then
    raise exception 'change reason is required' using errcode = '22023';
  end if;

  if p_consolidation_scope is null
    or length(btrim(p_consolidation_scope)) < 1
    or length(p_consolidation_scope) > 200
    or p_organizational_boundary is null
    or length(btrim(p_organizational_boundary)) < 1
    or length(p_organizational_boundary) > 200 then
    raise exception 'invalid scope or boundary' using errcode = '22023';
  end if;

  if p_actor_role is null or p_actor_role not in (
    'system_admin',
    'company_admin',
    'preparer'
  ) then
    raise exception 'actor is not authorized' using errcode = '42501';
  end if;
  v_actor_role := p_actor_role::public.app_role;

  perform 1
  from public.organization_members membership
  where membership.user_id = p_actor_user_id
    and membership.is_active
    and membership.role = v_actor_role
    and (
      membership.organization_id = p_organization_id
      or v_actor_role = 'system_admin'::public.app_role
    )
  for share;

  if not found then
    raise exception 'actor is not authorized' using errcode = '42501';
  end if;

  perform 1
    from public.companies company
    where company.id = p_company_id
      and company.organization_id = p_organization_id
  for key share;

  if not found then
    raise exception 'company scope mismatch' using errcode = '42501';
  end if;

  select period.label
  into v_period_label
    from public.reporting_periods period
    where period.id = p_reporting_period_id
      and period.organization_id = p_organization_id
      and period.company_id = p_company_id
      and period.status = 'open'
  for share;

  if not found then
    raise exception 'reporting period is unavailable' using errcode = '22023';
  end if;

  select metric.*
  into v_metric
  from public.metrics metric
  where metric.id = p_metric_id
    and metric.status = 'active'
    and (metric.organization_id is null or metric.organization_id = p_organization_id)
  for share;

  if not found then
    raise exception 'metric is unavailable' using errcode = '22023';
  end if;
  v_source_record_id := 'manual:' || v_metric.id::text;

  -- Serialize the actor/tenant bucket so the limit is shared across all app
  -- instances rather than relying on a process-local counter.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_organization_id::text || ':' || p_actor_user_id::text,
      0
    )
  );
  select count(*)
  into v_recent_command_count
  from public.audit_logs audit
  where audit.organization_id = p_organization_id
    and audit.actor_user_id = p_actor_user_id
    and audit.action in ('metric.manual.created', 'metric.manual.updated')
    and audit.created_at >= now() - interval '1 minute';

  if v_recent_command_count >= 30 then
    raise exception 'metric command rate limit exceeded' using errcode = 'P4290';
  end if;

  v_value_type := jsonb_typeof(p_value_json);
  if (v_metric.value_type = 'number' and v_value_type <> 'number')
    or (v_metric.value_type = 'text' and v_value_type <> 'string')
    or (v_metric.value_type = 'boolean' and v_value_type <> 'boolean')
    or v_metric.value_type = 'json' then
    raise exception 'metric value type mismatch' using errcode = '22023';
  end if;

  if p_unit is null
    or length(p_unit) > 40
    or (v_metric.canonical_unit is not null and p_unit <> v_metric.canonical_unit)
    or (
      cardinality(v_metric.allowed_units) > 0
      and not (p_unit = any (v_metric.allowed_units))
    ) then
    raise exception 'metric unit mismatch' using errcode = '22023';
  end if;

  v_original_value := jsonb_build_object('value', p_value_json) ->> 'value';
  if v_metric.value_type = 'number' then
    v_normalized_value := v_original_value::numeric;
  else
    v_normalized_value := null;
  end if;

  select value.*
  into v_existing
  from public.metric_values value
  where value.organization_id = p_organization_id
    and value.company_id = p_company_id
    and value.reporting_period_id = p_reporting_period_id
    and value.metric_id = p_metric_id
    and value.source_system = 'manual_entry'
    and value.source_record_id = v_source_record_id
  for update;

  if found then
    if v_existing.source_type <> 'manual' then
      raise exception 'non-manual provenance cannot be overwritten'
        using errcode = '42501';
    end if;
    if v_existing.version <> p_expected_version then
      raise exception 'stale metric version' using errcode = '40001';
    end if;
    v_before_state := jsonb_build_object(
      'version', v_existing.version,
      'unit', v_existing.unit,
      'change_reason_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_existing.change_reason, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'consolidation_scope_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_existing.consolidation_scope, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'organizational_boundary_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_existing.organizational_boundary, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'value_hash', encode(
        extensions.digest(convert_to(v_existing.value_json::text, 'UTF8'), 'sha256'),
        'hex'
      )
    );
  elsif p_expected_version <> 0 then
    raise exception 'stale metric version' using errcode = '40001';
  end if;

  insert into public.metric_values (
    organization_id,
    company_id,
    reporting_period_id,
    metric_id,
    value_json,
    original_value,
    normalized_value,
    unit,
    original_unit,
    consolidation_scope,
    organizational_boundary,
    source_type,
    source_system,
    source_record_id,
    imported_at,
    last_updated_at,
    confidence_level,
    verification_status,
    owner_user_id,
    change_reason,
    manual_override,
    version
  ) values (
    p_organization_id,
    p_company_id,
    p_reporting_period_id,
    p_metric_id,
    p_value_json,
    v_original_value,
    v_normalized_value,
    p_unit,
    p_unit,
    p_consolidation_scope,
    p_organizational_boundary,
    'manual',
    'manual_entry',
    v_source_record_id,
    now(),
    now(),
    'medium',
    'unverified',
    p_actor_user_id,
    btrim(p_change_reason),
    true,
    1
  )
  on conflict (
    organization_id,
    company_id,
    reporting_period_id,
    metric_id,
    source_system,
    source_record_id
  ) do update set
    value_json = excluded.value_json,
    original_value = excluded.original_value,
    normalized_value = excluded.normalized_value,
    unit = excluded.unit,
    original_unit = excluded.original_unit,
    consolidation_scope = excluded.consolidation_scope,
    organizational_boundary = excluded.organizational_boundary,
    last_updated_at = now(),
    owner_user_id = excluded.owner_user_id,
    change_reason = excluded.change_reason,
    manual_override = true,
    version = public.metric_values.version + 1,
    updated_at = now()
  where public.metric_values.source_type = 'manual'
    and public.metric_values.version = p_expected_version
  returning * into v_saved;

  if not found then
    raise exception 'stale metric version' using errcode = '40001';
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    request_id
  ) values (
    p_organization_id,
    p_actor_user_id,
    v_actor_role::text,
    case when v_before_state is null
      then 'metric.manual.created'
      else 'metric.manual.updated'
    end,
    'metric_value',
    v_saved.id,
    v_before_state,
    jsonb_build_object(
      'version', v_saved.version,
      'unit', v_saved.unit,
      'change_reason_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_saved.change_reason, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'consolidation_scope_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_saved.consolidation_scope, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'organizational_boundary_hash', encode(
        extensions.digest(
          convert_to(coalesce(v_saved.organizational_boundary, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'value_hash', encode(
        extensions.digest(convert_to(v_saved.value_json::text, 'UTF8'), 'sha256'),
        'hex'
      )
    ),
    p_request_id
  );

  return jsonb_build_object(
    'id', v_saved.id,
    'company_id', v_saved.company_id,
    'metric_id', v_saved.metric_id,
    'reporting_period_id', v_saved.reporting_period_id,
    'value_json', v_saved.value_json,
    'original_value', v_saved.original_value,
    'normalized_value', v_saved.normalized_value,
    'unit', v_saved.unit,
    'original_unit', v_saved.original_unit,
    'consolidation_scope', v_saved.consolidation_scope,
    'organizational_boundary', v_saved.organizational_boundary,
    'source_type', v_saved.source_type,
    'source_system', v_saved.source_system,
    'source_record_id', v_saved.source_record_id,
    'source_document', v_saved.source_document,
    'imported_at', v_saved.imported_at,
    'last_updated_at', v_saved.last_updated_at,
    'confidence_level', v_saved.confidence_level,
    'verification_status', v_saved.verification_status,
    'owner_user_id', v_saved.owner_user_id,
    'reviewer_user_id', v_saved.reviewer_user_id,
    'change_reason', v_saved.change_reason,
    'created_at', v_saved.created_at,
    'manual_override', v_saved.manual_override,
    'version', v_saved.version,
    'metrics', jsonb_build_object(
      'id', v_metric.id,
      'metric_code', v_metric.metric_code,
      'name', v_metric.name,
      'description', v_metric.description,
      'category', v_metric.category,
      'value_type', v_metric.value_type,
      'canonical_unit', v_metric.canonical_unit,
      'allowed_units', v_metric.allowed_units,
      'is_required', v_metric.is_required,
      'is_sensitive', v_metric.is_sensitive,
      'terrast_field_key', v_metric.terrast_field_key
    ),
    'reporting_periods', jsonb_build_object('label', v_period_label)
  );
end;
$$;

revoke all on function public.save_manual_metric_value_with_audit(
  uuid, uuid, uuid, uuid, jsonb, text, text, text, text, integer, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.save_manual_metric_value_with_audit(
  uuid, uuid, uuid, uuid, jsonb, text, text, text, text, integer, uuid, text, text
) to service_role;

-- Service credentials may append immutable history but cannot hard-delete any
-- application row (and therefore cannot erase history through parent CASCADE).
-- Invitation-token hashes remain the sole short-lived hard-delete exception.
revoke delete on all tables in schema public from service_role;
grant delete on public.supplier_invitation_secrets to service_role;

revoke update on
  public.audit_logs,
  public.ai_generation_logs,
  public.approvals,
  public.review_comments,
  public.terrast_sync_records,
  public.calculation_records,
  public.disclosure_drafts
from service_role;

comment on function public.save_manual_metric_value_with_audit(
  uuid, uuid, uuid, uuid, jsonb, text, text, text, text, integer, uuid, text, text
) is
  'Service-only atomic command for a validated manual metric value and redacted audit event.';
