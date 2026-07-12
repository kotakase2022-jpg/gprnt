begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Test identities are transactional and use reserved .invalid addresses.
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
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'rls-company-admin@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'rls-platform-operator@example.invalid',
    '',
    now(),
    '{}'::jsonb,
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'company_admin',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'platform_operator_demo_admin',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'system_admin',
    true
  );

-- Keep this test independent of the wall-clock date while retaining a bounded
-- consent check in the application policy.
update public.company_sharing_consents
set valid_from = current_date - 1,
    valid_until = current_date + 1
where id = '51000000-0000-4000-8000-000000000001';

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'role', 'authenticated',
    'is_anonymous', false,
    'app_metadata', '{}'::jsonb
  )::text,
  true
);

select is(
  (select count(*) from public.companies),
  1::bigint,
  'company admin sees only companies in its organization'
);

select is(
  (
    select count(*)
    from public.companies
    where organization_id = '22222222-2222-4222-8222-222222222222'
  ),
  0::bigint,
  'company admin cannot select another tenant company'
);

select is(
  (select count(*) from public.metric_values),
  9::bigint,
  'company admin sees only its three years of tenant metric values'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'role', 'authenticated',
    'is_anonymous', false,
    'app_metadata', '{}'::jsonb
  )::text,
  true
);

select is(
  (select count(*) from public.companies),
  1::bigint,
  'platform operator sees the one actively consented company summary'
);

select is(
  (select count(*) from public.metric_values),
  0::bigint,
  'platform operator cannot read consented company metric details'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'role', 'authenticated',
    'is_anonymous', true,
    'app_metadata', '{}'::jsonb
  )::text,
  true
);

select is(
  (select count(*) from public.companies),
  0::bigint,
  'anonymous-auth identity is rejected even when a membership row exists'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'role', 'authenticated',
    'is_anonymous', false,
    'app_metadata', jsonb_build_object('role', 'system_admin')
  )::text,
  true
);

select is(
  (select count(*) from public.companies),
  3::bigint,
  'trusted app_metadata plus active system-admin membership grants visibility'
);

reset role;

update public.organization_members
set is_active = false
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  and role = 'system_admin';

set local role authenticated;

select is(
  (select count(*) from public.companies),
  1::bigint,
  'revoked system-admin membership constrains a still-valid JWT immediately'
);

select * from finish();

rollback;
