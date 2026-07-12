begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'authenticated',
  'authenticated',
  'metric-preparer@example.invalid',
  '',
  now(),
  '{"role":"preparer"}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  is_active
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'preparer',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'system_admin',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'reviewer_approver',
    true
  );

select has_function(
  'public',
  'save_manual_metric_value_with_audit',
  array[
    'uuid', 'uuid', 'uuid', 'uuid', 'jsonb', 'text',
    'text', 'text', 'text', 'integer', 'uuid', 'text', 'text'
  ],
  'manual metric command exists with the reviewed signature'
);

select function_privs_are(
  'public',
  'save_manual_metric_value_with_audit',
  array[
    'uuid', 'uuid', 'uuid', 'uuid', 'jsonb', 'text',
    'text', 'text', 'text', 'integer', 'uuid', 'text', 'text'
  ],
  'service_role',
  array['EXECUTE'],
  'only the server role receives command execution privilege'
);

create temporary table manual_command_results (payload jsonb not null);
grant insert, select on table manual_command_results to service_role;

set local role service_role;

select lives_ok(
  $$
    insert into pg_temp.manual_command_results (payload)
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '12345'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '月次確定値への手動補正',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-create'
    )
  $$,
  'authorized preparer can create a manual metric value'
);

select ok(
  (
    select
      (payload ->> 'version')::integer = 1
      and payload ?& array[
        'id', 'company_id', 'metric_id', 'reporting_period_id',
        'value_json', 'source_type', 'manual_override', 'metrics',
        'reporting_periods'
      ]
    from pg_temp.manual_command_results
  ),
  'atomic command returns the strict saved-row mapper contract'
);

select is(
  (
    select version
    from public.metric_values
    where company_id = 'c1111111-1111-4111-8111-111111111111'
      and reporting_period_id = '11000000-0000-4000-8000-000000002025'
      and metric_id = 'a1000000-0000-4000-8000-000000000001'
      and source_system = 'manual_entry'
  ),
  1,
  'created manual value starts at version one'
);

select is(
  (
    select count(*)
    from public.audit_logs
    where request_id = 'metric-command-create'
      and action = 'metric.manual.created'
  ),
  1::bigint,
  'create writes one audit event in the same command'
);

select is(
  (
    select actor_role
    from public.audit_logs
    where request_id = 'metric-command-create'
  ),
  'preparer',
  'audit records the exact role authorized by the route'
);

select lives_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '12340'::jsonb,
      'tCO2e',
      '国内連結',
      '国内連結子会社',
      'レビュー指摘に基づく修正',
      1,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-update'
    )
  $$,
  'matching expected version can update the manual value'
);

select is(
  (
    select version
    from public.metric_values
    where company_id = 'c1111111-1111-4111-8111-111111111111'
      and reporting_period_id = '11000000-0000-4000-8000-000000002025'
      and metric_id = 'a1000000-0000-4000-8000-000000000001'
      and source_system = 'manual_entry'
  ),
  2,
  'successful update increments the version'
);

select ok(
  (
    select
      before_state ->> 'consolidation_scope_hash'
        is distinct from after_state ->> 'consolidation_scope_hash'
      and before_state ->> 'organizational_boundary_hash'
        is distinct from after_state ->> 'organizational_boundary_hash'
      and before_state ->> 'change_reason_hash'
        is distinct from after_state ->> 'change_reason_hash'
    from public.audit_logs
    where request_id = 'metric-command-update'
  ),
  'reason, scope and boundary changes retain redacted before/after provenance'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '99999'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '古い画面からの更新を試行',
      1,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-stale'
    )
  $$,
  '40001',
  'stale metric version',
  'stale expected version is rejected'
);

select is(
  (
    select count(*)
    from public.audit_logs
    where request_id = 'metric-command-stale'
  ),
  0::bigint,
  'rejected update does not append an audit event'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '22222222-2222-4222-8222-222222222222',
      'c2222222-2222-4222-8222-222222222222',
      '22000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '100'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '別テナントへの更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-cross-tenant'
    )
  $$,
  '42501',
  'actor is not authorized',
  'actor without target-tenant membership is rejected'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002024',
      'a1000000-0000-4000-8000-000000000001',
      '100'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '締切済み期間への更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-negative-closed'
    )
  $$,
  '22023',
  'reporting period is unavailable',
  'closed reporting periods reject manual writes'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a9999999-9999-4999-8999-999999999999',
      '100'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '未知の指標への更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-negative-metric'
    )
  $$,
  '22023',
  'metric is unavailable',
  'unknown metrics reject manual writes'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000002',
      '"not-a-number"'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '不正な型で更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-negative-type'
    )
  $$,
  '22023',
  'metric value type mismatch',
  'catalog type mismatches reject manual writes'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000002',
      '100'::jsonb,
      'kg',
      '連結',
      '国内外連結子会社',
      '不正な単位で更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-negative-unit'
    )
  $$,
  '22023',
  'metric unit mismatch',
  'catalog unit mismatches reject manual writes'
);

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000002',
      '100'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '許可されていないロールで更新を試行',
      0,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'reviewer_approver',
      'metric-command-negative-role'
    )
  $$,
  '42501',
  'actor is not authorized',
  'review-only roles cannot execute the write command'
);

reset role;

insert into public.metric_values (
  organization_id,
  company_id,
  reporting_period_id,
  metric_id,
  value_json,
  unit,
  source_type,
  source_system,
  source_record_id
) values (
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  '11000000-0000-4000-8000-000000002025',
  'a1000000-0000-4000-8000-000000000004',
  '810'::jsonb,
  '人',
  'terrast_mock',
  'manual_entry',
  'manual:a1000000-0000-4000-8000-000000000004'
);

set local role service_role;

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000004',
      '820'::jsonb,
      '人',
      '連結',
      '国内外連結子会社',
      '非手動来歴の上書きを試行',
      1,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-negative-provenance'
    )
  $$,
  '42501',
  'non-manual provenance cannot be overwritten',
  'a manual command cannot overwrite non-manual provenance'
);

select ok(
  (
    select count(*) = 0
    from public.audit_logs
    where request_id like 'metric-command-negative-%'
  )
  and (
    select source_type = 'terrast_mock' and value_json = '810'::jsonb
    from public.metric_values
    where metric_id = 'a1000000-0000-4000-8000-000000000004'
      and source_system = 'manual_entry'
      and source_record_id = 'manual:a1000000-0000-4000-8000-000000000004'
  ),
  'rejected commands leave both value and audit state unchanged'
);

reset role;

update public.metrics
set metric_code = 'GHG_SCOPE_1_RENAMED'
where id = 'a1000000-0000-4000-8000-000000000001';

set local role service_role;

select lives_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '12335'::jsonb,
      'tCO2e',
      '国内連結',
      '国内連結子会社',
      '指標コード変更後も同じ値を更新',
      2,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-code-rename'
    )
  $$,
  'metric code changes do not split the stable manual row identity'
);

select ok(
  (
    select count(*) = 1 and max(version) = 3
    from public.metric_values
    where metric_id = 'a1000000-0000-4000-8000-000000000001'
      and source_system = 'manual_entry'
      and source_record_id = 'manual:a1000000-0000-4000-8000-000000000001'
  ),
  'metric UUID keeps one optimistic-lock stream after a code rename'
);

reset role;

insert into public.audit_logs (
  organization_id,
  actor_user_id,
  actor_role,
  action,
  entity_type,
  request_id
)
select
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'preparer',
  'metric.manual.updated',
  'metric_value',
  'rate-limit-fixture-' || sequence::text
from generate_series(1, 27) sequence;

set local role service_role;

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '12330'::jsonb,
      'tCO2e',
      '連結',
      '国内外連結子会社',
      '短時間の連続更新を試行',
      3,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-rate-limited'
    )
  $$,
  'P4290',
  'metric command rate limit exceeded',
  'shared actor and tenant rate limit rejects the thirty-first write'
);

reset role;

update public.organization_members
set is_active = false
where organization_id = '11111111-1111-4111-8111-111111111111'
  and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  and role = 'preparer';

set local role service_role;

select throws_ok(
  $$
    select public.save_manual_metric_value_with_audit(
      '11111111-1111-4111-8111-111111111111',
      'c1111111-1111-4111-8111-111111111111',
      '11000000-0000-4000-8000-000000002025',
      'a1000000-0000-4000-8000-000000000001',
      '12320'::jsonb,
      'tCO2e',
      '国内連結',
      '国内連結子会社',
      '失効後の作成者ロールで更新を試行',
      3,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'preparer',
      'metric-command-revoked-role'
    )
  $$,
  '42501',
  'actor is not authorized',
  'a different active system-admin membership cannot replace the revoked effective role'
);

select * from finish();

rollback;
