begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array[
        'organizations', 'organization_members', 'user_profiles', 'companies',
        'company_sharing_consents', 'reporting_periods', 'frameworks',
        'framework_versions', 'disclosure_requirements', 'requirement_mappings',
        'metrics', 'metric_values', 'emission_factors', 'calculation_records',
        'evidence_files', 'disclosure_responses', 'disclosure_drafts',
        'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
        'transition_targets', 'transition_actions', 'supplier_requests',
        'supplier_responses', 'marketplace_offerings', 'terrast_sync_jobs',
        'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
  ),
  30::bigint,
  'all 30 required public tables exist'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array[
        'organizations', 'organization_members', 'user_profiles', 'companies',
        'company_sharing_consents', 'reporting_periods', 'frameworks',
        'framework_versions', 'disclosure_requirements', 'requirement_mappings',
        'metrics', 'metric_values', 'emission_factors', 'calculation_records',
        'evidence_files', 'disclosure_responses', 'disclosure_drafts',
        'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
        'transition_targets', 'transition_actions', 'supplier_requests',
        'supplier_responses', 'marketplace_offerings', 'terrast_sync_jobs',
        'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
      and not c.relrowsecurity
  ),
  0::bigint,
  'RLS is enabled on every required public table'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array[
        'organizations', 'organization_members', 'user_profiles', 'companies',
        'company_sharing_consents', 'reporting_periods', 'frameworks',
        'framework_versions', 'disclosure_requirements', 'requirement_mappings',
        'metrics', 'metric_values', 'emission_factors', 'calculation_records',
        'evidence_files', 'disclosure_responses', 'disclosure_drafts',
        'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
        'transition_targets', 'transition_actions', 'supplier_requests',
        'supplier_responses', 'marketplace_offerings', 'terrast_sync_jobs',
        'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
      and not c.relforcerowsecurity
  ),
  0::bigint,
  'RLS is forced on every required public table'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0::bigint,
  'anon has no application-table CRUD privilege'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and cmd = 'UPDATE'
      and (qual is null or with_check is null)
  ),
  0::bigint,
  'every public UPDATE policy has USING and WITH CHECK'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and 'anon' = any (roles)
  ),
  0::bigint,
  'no public application policy targets anon'
);

select ok(
  (
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'supplier_invitation_secrets'
  ),
  'service-only supplier invitation hashes have forced RLS'
);

select is(
  (select public from storage.buckets where id = 'evidence'),
  false,
  'evidence bucket is private'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'evidence_storage_%'
  ),
  4::bigint,
  'evidence bucket has SELECT, INSERT, UPDATE, and DELETE policies'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(
      coalesce(p.proacl, acldefault('f', p.proowner))
    ) privilege
    where n.nspname = 'private'
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute private helper functions'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ),
  0::bigint,
  'every private SECURITY DEFINER helper has an empty search_path'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef
      and pg_get_functiondef(p.oid) not ilike '%auth.uid()%'
  ),
  0::bigint,
  'every private SECURITY DEFINER helper verifies auth.uid()'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and pg_get_functiondef(p.oid) ilike '%user_metadata%'
  ),
  0::bigint,
  'private authorization helpers never inspect user_metadata'
);

select cmp_ok(
  (
    select count(*)
    from pg_catalog.pg_constraint
    where contype = 'f'
      and conname like '%_tenant_fkey'
  ),
  '>=',
  23::bigint,
  'tenant-owned relationships have composite organization foreign keys'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_namespace n
    cross join lateral aclexplode(
      coalesce(n.nspacl, acldefault('n', n.nspowner))
    ) privilege
    where n.nspname = 'private'
      and privilege.grantee = 0
      and privilege.privilege_type = 'USAGE'
  ),
  0::bigint,
  'PUBLIC cannot use the private schema'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'DELETE'
  ),
  0::bigint,
  'authenticated clients have no public hard-delete privilege'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
      and table_name = any (array[
        'calculation_records', 'metric_values', 'disclosure_responses',
        'disclosure_drafts', 'review_tasks', 'review_comments', 'approvals',
        'terrast_sync_jobs', 'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
  ),
  0::bigint,
  'append-only public tables revoke authenticated UPDATE'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'INSERT'
      and table_name = any (array[
        'calculation_records', 'metric_values', 'disclosure_responses',
        'review_tasks', 'approvals', 'terrast_sync_jobs',
        'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
  ),
  0::bigint,
  'server-owned provenance tables revoke authenticated INSERT'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'supplier_invitation_secrets'
      and grantee = 'authenticated'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0::bigint,
  'authenticated clients have no invitation-hash table privilege'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'supplier_invitation_secrets'
      and grantee = 'service_role'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  4::bigint,
  'server-only service role can manage invitation hashes'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
      and table_name = any (array[
        'organizations', 'organization_members', 'user_profiles', 'companies',
        'company_sharing_consents', 'reporting_periods', 'frameworks',
        'framework_versions', 'disclosure_requirements', 'requirement_mappings',
        'metrics', 'metric_values', 'emission_factors', 'calculation_records',
        'evidence_files', 'disclosure_responses', 'disclosure_drafts',
        'review_tasks', 'review_comments', 'approvals', 'risks_opportunities',
        'transition_targets', 'transition_actions', 'supplier_requests',
        'supplier_responses', 'marketplace_offerings', 'terrast_sync_jobs',
        'terrast_sync_records', 'ai_generation_logs', 'audit_logs'
      ])
  ),
  30::bigint,
  'service role has explicit access to all required public tables'
);

select * from finish();

rollback;
