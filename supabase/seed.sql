-- Synthetic demo data only. No real company, customer, credential, API payload,
-- or official emission factor is contained in this seed.

insert into public.organizations (
  id, tenant_id, name, slug, organization_type
)
values
  ('11111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', '日本未来製造株式会社', 'nihon-mirai-manufacturing', 'company'),
  ('22222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'ネクストリテール株式会社', 'next-retail', 'company'),
  ('33333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'グリーンテックサービス株式会社', 'green-tech-service', 'company'),
  ('44444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', '全国市場運営デモ組織', 'national-market-operator-demo', 'platform_operator')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  organization_type = excluded.organization_type;

insert into public.companies (
  id, organization_id, company_code, legal_name, name_en, securities_code,
  industry_code, industry_category, industry_name, market_segment, size_category, employee_band,
  fiscal_year_end_month, terrast_external_id, is_demo
)
values
  ('c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'DEMO-COMPANY-001', '日本未来製造株式会社', 'Nihon Mirai Manufacturing Co., Ltd. (Demo)', 'D101', 'E24', 'manufacturing', '製造業', 'demo_prime', 'large', '1,000–4,999人', 3, 'terrast-mock-company-001', true),
  ('c2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'DEMO-COMPANY-002', 'ネクストリテール株式会社', 'Next Retail Co., Ltd. (Demo)', 'D202', 'I56', 'retail', '小売業', 'demo_standard', 'large', '5,000人以上', 3, 'terrast-mock-company-002', true),
  ('c3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'DEMO-COMPANY-003', 'グリーンテックサービス株式会社', 'Green Tech Service Co., Ltd. (Demo)', 'D303', 'G39', 'information_services', '情報サービス業', 'demo_growth', 'medium', '500–999人', 3, 'terrast-mock-company-003', true)
on conflict (id) do update set
  company_code = excluded.company_code,
  legal_name = excluded.legal_name,
  name_en = excluded.name_en,
  securities_code = excluded.securities_code,
  industry_category = excluded.industry_category,
  industry_name = excluded.industry_name,
  market_segment = excluded.market_segment,
  size_category = excluded.size_category,
  fiscal_year_end_month = excluded.fiscal_year_end_month,
  terrast_external_id = excluded.terrast_external_id,
  employee_band = excluded.employee_band,
  is_demo = true;

insert into public.reporting_periods (
  id, organization_id, company_id, label, start_date, end_date, status, is_baseline
)
values
  ('11000000-0000-4000-8000-000000002023', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '2023年度', '2023-04-01', '2024-03-31', 'closed', true),
  ('11000000-0000-4000-8000-000000002024', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '2024年度', '2024-04-01', '2025-03-31', 'closed', false),
  ('11000000-0000-4000-8000-000000002025', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '2025年度', '2025-04-01', '2026-03-31', 'open', false),
  ('22000000-0000-4000-8000-000000002023', '22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '2023年度', '2023-04-01', '2024-03-31', 'closed', true),
  ('22000000-0000-4000-8000-000000002024', '22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '2024年度', '2024-04-01', '2025-03-31', 'closed', false),
  ('22000000-0000-4000-8000-000000002025', '22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '2025年度', '2025-04-01', '2026-03-31', 'open', false),
  ('33000000-0000-4000-8000-000000002023', '33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '2023年度', '2023-04-01', '2024-03-31', 'closed', true),
  ('33000000-0000-4000-8000-000000002024', '33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '2024年度', '2024-04-01', '2025-03-31', 'closed', false),
  ('33000000-0000-4000-8000-000000002025', '33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '2025年度', '2025-04-01', '2026-03-31', 'open', false)
on conflict (id) do update set
  label = excluded.label,
  status = excluded.status,
  is_baseline = excluded.is_baseline;

insert into public.frameworks (
  id, organization_id, code, name, publisher, source_url, status
)
values
  ('f1000000-0000-4000-8000-000000000001', null, 'SSBJ-DEMO', 'SSBJ対応デモ要求事項', 'サステナビリティ基準委員会（参照元）', 'https://www.ssb-j.jp/jp/', 'active'),
  ('f1000000-0000-4000-8000-000000000002', null, 'ISSB-DEMO', 'ISSB対応デモ要求事項', 'IFRS Foundation（参照元）', 'https://www.ifrs.org/groups/international-sustainability-standards-board/', 'active')
on conflict (id) do update set
  name = excluded.name,
  source_url = excluded.source_url,
  status = excluded.status;

insert into public.framework_versions (
  id, organization_id, framework_id, version_label, effective_date, status, source_url
)
values
  ('f2000000-0000-4000-8000-000000000001', null, 'f1000000-0000-4000-8000-000000000001', 'demo-2025', '2025-03-05', 'active', 'https://www.ssb-j.jp/jp/ssbj_standards/'),
  ('f2000000-0000-4000-8000-000000000002', null, 'f1000000-0000-4000-8000-000000000002', 'demo-s1-s2', '2024-01-01', 'active', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/')
on conflict (id) do update set
  version_label = excluded.version_label,
  source_url = excluded.source_url,
  status = excluded.status;

insert into public.disclosure_requirements (
  id, organization_id, framework_version_id, requirement_code, short_summary,
  data_fields, source_url, applicable_from, status
)
values
  ('d1000000-0000-4000-8000-000000000001', null, 'f2000000-0000-4000-8000-000000000001', 'DEMO-GOV-01', 'サステナビリティ課題を監督する体制と責任を説明する。', '["oversight_body","meeting_frequency","responsibilities"]', 'https://www.ssb-j.jp/jp/ssbj_standards/', '2025-03-05', 'active'),
  ('d1000000-0000-4000-8000-000000000002', null, 'f2000000-0000-4000-8000-000000000001', 'DEMO-CLM-01', 'Scope 1・2・3の排出実績、算定範囲、算定方法を説明する。', '["scope_1","scope_2","scope_3","boundary","method"]', 'https://www.ssb-j.jp/jp/ssbj_standards/', '2025-03-05', 'active'),
  ('d1000000-0000-4000-8000-000000000003', null, 'f2000000-0000-4000-8000-000000000002', 'DEMO-TRN-01', '気候目標、移行施策、資源配分と進捗の関係を説明する。', '["target","actions","capex","opex","progress"]', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/', '2024-01-01', 'active')
on conflict (id) do update set
  short_summary = excluded.short_summary,
  data_fields = excluded.data_fields,
  source_url = excluded.source_url;

insert into public.metrics (
  id, organization_id, metric_code, name, category, value_type,
  canonical_unit, description, status
)
values
  ('a1000000-0000-4000-8000-000000000001', null, 'GHG_SCOPE_1', 'Scope 1排出量', 'ghg', 'number', 'tCO2e', '組織が直接排出した温室効果ガスのデモ指標。', 'active'),
  ('a1000000-0000-4000-8000-000000000002', null, 'GHG_SCOPE_2_MARKET', 'Scope 2排出量（マーケット基準）', 'ghg', 'number', 'tCO2e', '購入エネルギー由来排出量のデモ指標。', 'active'),
  ('a1000000-0000-4000-8000-000000000003', null, 'GHG_SCOPE_3', 'Scope 3排出量', 'ghg', 'number', 'tCO2e', 'バリューチェーン排出量のデモ指標。', 'active'),
  ('a1000000-0000-4000-8000-000000000004', null, 'EMPLOYEE_COUNT', '従業員数', 'human_capital', 'number', '人', '期末従業員数のデモ指標。', 'active'),
  ('a1000000-0000-4000-8000-000000000005', null, 'RENEWABLE_ELECTRICITY_RATE', '再生可能電力比率', 'energy', 'number', '%', '総購入電力量に占める再生可能電力のデモ比率。', 'active')
on conflict (id) do update set
  name = excluded.name,
  canonical_unit = excluded.canonical_unit,
  description = excluded.description;

insert into public.requirement_mappings (
  id, organization_id, requirement_id, metric_id, terrast_field,
  transformation_rule, mapping_version, status
)
values
  ('b1000000-0000-4000-8000-000000000001', null, 'd1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'ghg.scope1.total', '{"operation":"identity"}', 'demo-v1', 'active'),
  ('b1000000-0000-4000-8000-000000000002', null, 'd1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'ghg.scope2.market_based', '{"operation":"identity"}', 'demo-v1', 'active'),
  ('b1000000-0000-4000-8000-000000000003', null, 'd1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'ghg.scope3.total', '{"operation":"identity"}', 'demo-v1', 'active')
on conflict (id) do update set
  terrast_field = excluded.terrast_field,
  transformation_rule = excluded.transformation_rule,
  mapping_version = excluded.mapping_version;

-- Three fiscal years for each of the three fictional companies. Every record is
-- marked as MockTerrastConnector provenance rather than a real TERRAST payload.
with demo_values (
  organization_id, company_id, reporting_period_id, metric_id,
  source_record_id, numeric_value, unit, confidence_level
) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111111'::uuid, '11000000-0000-4000-8000-000000002023'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'demo-mm-2023-s1', 12400::numeric, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000002', 'demo-mm-2023-s2', 8900, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000003', 'demo-mm-2023-s3', 48100, 'tCO2e', 'low'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000001', 'demo-mm-2024-s1', 11900, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000002', 'demo-mm-2024-s2', 8100, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000003', 'demo-mm-2024-s3', 47200, 'tCO2e', 'low'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000001', 'demo-mm-2025-s1', 11100, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000002', 'demo-mm-2025-s2', 7200, 'tCO2e', 'high'),
    ('11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', '11000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000003', 'demo-mm-2025-s3', 45900, 'tCO2e', 'low'),

    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000001', 'demo-nr-2023-s1', 3100, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000002', 'demo-nr-2023-s2', 17400, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000003', 'demo-nr-2023-s3', 162000, 'tCO2e', 'low'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000001', 'demo-nr-2024-s1', 2980, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000002', 'demo-nr-2024-s2', 16600, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000003', 'demo-nr-2024-s3', 158000, 'tCO2e', 'low'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000001', 'demo-nr-2025-s1', 2850, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000002', 'demo-nr-2025-s2', 15900, 'tCO2e', 'medium'),
    ('22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222', '22000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000003', 'demo-nr-2025-s3', 151000, 'tCO2e', 'low'),

    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000001', 'demo-gs-2023-s1', 410, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000002', 'demo-gs-2023-s2', 1320, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000003', 'demo-gs-2023-s3', 4100, 'tCO2e', 'medium'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000001', 'demo-gs-2024-s1', 380, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000002', 'demo-gs-2024-s2', 1180, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000003', 'demo-gs-2024-s3', 3950, 'tCO2e', 'medium'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000001', 'demo-gs-2025-s1', 350, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000002', 'demo-gs-2025-s2', 1020, 'tCO2e', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000003', 'demo-gs-2025-s3', 3760, 'tCO2e', 'medium'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002023', 'a1000000-0000-4000-8000-000000000004', 'demo-gs-2023-employees', 720, '人', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002024', 'a1000000-0000-4000-8000-000000000004', 'demo-gs-2024-employees', 760, '人', 'high'),
    ('33333333-3333-4333-8333-333333333333', 'c3333333-3333-4333-8333-333333333333', '33000000-0000-4000-8000-000000002025', 'a1000000-0000-4000-8000-000000000004', 'demo-gs-2025-employees', 810, '人', 'high')
)
insert into public.metric_values (
  organization_id, company_id, reporting_period_id, metric_id, value_json,
  original_value, normalized_value, unit, original_unit,
  consolidation_scope, organizational_boundary, source_type, source_system,
  source_record_id, imported_at, confidence_level, verification_status,
  change_reason
)
select
  organization_id,
  company_id,
  reporting_period_id,
  metric_id,
  jsonb_build_object('value', numeric_value),
  numeric_value::text,
  numeric_value,
  unit,
  unit,
  '連結（デモ）',
  'デモ組織境界',
  'terrast_mock',
  'MockTerrastConnector',
  source_record_id,
  now(),
  confidence_level,
  'unverified',
  '合成デモデータの初期ロード'
from demo_values
on conflict (
  organization_id, company_id, reporting_period_id, metric_id,
  source_system, source_record_id
)
do update set
  value_json = excluded.value_json,
  original_value = excluded.original_value,
  normalized_value = excluded.normalized_value,
  confidence_level = excluded.confidence_level,
  last_updated_at = now();

insert into public.emission_factors (
  id, organization_id, factor_code, name, factor_value, numerator_unit,
  denominator_unit, factor_year, version_label, source_url, is_demo_data
)
values
  ('e1000000-0000-4000-8000-000000000001', null, 'DEMO-ELECTRICITY-2025', '購入電力デモ係数', 0.000410, 'tCO2e', 'kWh', 2025, 'DEMO DATA v1', null, true),
  ('e1000000-0000-4000-8000-000000000002', null, 'DEMO-FUEL-2025', '燃料使用デモ係数', 0.002320, 'tCO2e', 'L', 2025, 'DEMO DATA v1', null, true)
on conflict (id) do update set
  factor_value = excluded.factor_value,
  version_label = excluded.version_label,
  is_demo_data = true;

insert into public.company_sharing_consents (
  id, organization_id, company_id, grantee_organization_id,
  data_categories, purpose, status, valid_from, valid_until, consented_at
)
values (
  '51000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  array['company_summary', 'readiness_aggregate'],
  'コンセプトMVPにおける集計・個社サマリー表示のデモ',
  'active',
  '2026-01-01',
  '2027-12-31',
  now()
)
on conflict (id) do update set
  data_categories = excluded.data_categories,
  purpose = excluded.purpose,
  status = excluded.status,
  valid_until = excluded.valid_until;

insert into public.terrast_sync_jobs (
  id, organization_id, company_id, connector_mode, idempotency_key,
  is_dry_run, status, summary
)
values (
  '61000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  'mock',
  'demo-preview-nihon-mirai-2025-v1',
  true,
  'preview_ready',
  '{"added":1,"updated":1,"conflicts":1,"unchanged":1}'
)
on conflict (id) do update set
  is_dry_run = excluded.is_dry_run,
  status = excluded.status,
  summary = excluded.summary;

insert into public.terrast_sync_records (
  id, organization_id, sync_job_id, metric_id, source_record_id,
  change_type, before_value, incoming_value, provenance
)
values
  ('62000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '61000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'preview-scope1', 'updated', '{"value":11200,"unit":"tCO2e"}', '{"value":11100,"unit":"tCO2e"}', '{"source":"MockTerrastConnector","retrieved_at":"2026-07-01T00:00:00Z"}'),
  ('62000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '61000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 'preview-scope3', 'conflict', '{"value":45200,"unit":"tCO2e","source":"manual"}', '{"value":45900,"unit":"tCO2e","source":"terrast_mock"}', '{"source":"MockTerrastConnector","retrieved_at":"2026-07-01T00:00:00Z"}')
on conflict (id) do update set
  change_type = excluded.change_type,
  before_value = excluded.before_value,
  incoming_value = excluded.incoming_value,
  provenance = excluded.provenance;

insert into public.risks_opportunities (
  id, organization_id, company_id, record_type, risk_type, title, description,
  likelihood, impact, time_horizon, affected_business,
  financial_impact_direction, response_strategy, governance_oversight
)
values (
  '71000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  'risk',
  'transition',
  '高炭素原材料の調達コスト上昇（デモ）',
  '炭素価格の上昇を仮定した合成シナリオ。実在データや将来予測ではない。',
  3,
  4,
  'medium',
  '主要製造事業',
  'negative',
  '低炭素材料への段階的な切替を検討する。',
  '経営会議へ四半期報告（デモ）'
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  response_strategy = excluded.response_strategy;

insert into public.transition_targets (
  id, organization_id, company_id, metric_id, title, baseline_year,
  target_year, baseline_value, target_value, unit, progress_value, status
)
values (
  '72000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  'a1000000-0000-4000-8000-000000000001',
  'Scope 1排出量削減デモ目標',
  2023,
  2030,
  12400,
  8680,
  'tCO2e',
  11100,
  'on_track'
)
on conflict (id) do update set
  progress_value = excluded.progress_value,
  status = excluded.status;

insert into public.transition_actions (
  id, organization_id, company_id, transition_target_id,
  risk_opportunity_id, title, description, kpi, capex_amount, opex_amount,
  currency, due_date, progress_percent, status
)
values (
  '73000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '製造設備の電化検討（デモ）',
  '設備更新候補の優先順位と概算投資額を整理する合成施策。',
  '更新候補設備の評価完了率',
  250000000,
  12000000,
  'JPY',
  '2027-03-31',
  45,
  'in_progress'
)
on conflict (id) do update set
  progress_percent = excluded.progress_percent,
  status = excluded.status;

insert into public.marketplace_offerings (
  id, organization_id, category, name, provider_name, description,
  matching_rules, is_synthetic, status
)
values
  ('81000000-0000-4000-8000-000000000001', null, 'decarbonization', '製造設備電化診断デモ', '架空ソリューションA', '排出ホットスポットの設備更新候補を整理する架空サービス。', '{"industries":["製造業"],"gap_codes":["TRANSITION_CAPEX"]}', true, 'active'),
  ('81000000-0000-4000-8000-000000000002', null, 'disclosure_support', 'Scope 3収集設計支援デモ', '架空ソリューションB', 'サプライヤー回答設計を支援する架空サービス。', '{"gap_codes":["SCOPE3_DATA"]}', true, 'active'),
  ('81000000-0000-4000-8000-000000000003', null, 'education', 'SSBJ実務研修デモ', '架空ソリューションC', '開示ワークフローを学ぶ架空研修。', '{"gap_codes":["WORKFLOW_READINESS"]}', true, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  matching_rules = excluded.matching_rules,
  is_synthetic = true;

insert into public.audit_logs (
  id, organization_id, actor_role, action, entity_type, entity_id, after_state
)
values (
  '91000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'system_seed',
  'demo.seed.created',
  'terrast_sync_job',
  '61000000-0000-4000-8000-000000000001',
  '{"synthetic":true,"contains_real_customer_data":false}'
)
on conflict (id) do nothing;
