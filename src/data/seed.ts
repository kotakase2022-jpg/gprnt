import { calculateGhgEmissions } from "@/domain/ghg";
import type {
  CalculationRecord,
  Company,
  DemoDataset,
  DisclosureRequirement,
  DisclosureResponse,
  EmissionFactor,
  Framework,
  FrameworkVersion,
  MarketplaceOffering,
  MetricDefinition,
  MetricScalar,
  MetricValue,
  Organization,
  ReportingPeriod,
  RequirementMapping,
  TerrastMetricRecord,
  UserProfile,
} from "@/domain/types";

export const DEMO_DATASET_TIMESTAMP = "2026-07-01T00:00:00.000Z";
export const DEMO_FISCAL_YEARS = [2023, 2024, 2025] as const;

export const demoOrganizations: Organization[] = [
  {
    id: "org-system",
    name: "サステナブル・ラボ デモ運営",
    type: "system_operator",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-platform",
    name: "市場基盤デモ運営者",
    type: "platform_operator",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-mirai",
    name: "日本未来製造株式会社",
    type: "company",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-next-retail",
    name: "ネクストリテール株式会社",
    type: "company",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-green-tech",
    name: "グリーンテックサービス株式会社",
    type: "company",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-assurance",
    name: "みらい保証デモ事務所",
    type: "assurance",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
  {
    id: "org-supplier",
    name: "青空部品デモ株式会社",
    type: "supplier",
    isSynthetic: true,
    createdAt: DEMO_DATASET_TIMESTAMP,
  },
];

export const demoUsers: UserProfile[] = [
  {
    id: "user-system-admin",
    displayName: "システム管理者（デモ）",
    email: "system-admin@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-platform",
    displayName: "市場運営者（デモ）",
    email: "platform@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-company-admin",
    displayName: "企業管理者（デモ）",
    email: "company-admin@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-preparer",
    displayName: "作成担当者（デモ）",
    email: "preparer@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-reviewer",
    displayName: "レビュー・承認者（デモ）",
    email: "reviewer@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-assurer",
    displayName: "外部保証閲覧者（デモ）",
    email: "assurer@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
  {
    id: "user-supplier",
    displayName: "サプライヤー回答者（デモ）",
    email: "supplier@example.invalid",
    locale: "ja",
    isSynthetic: true,
  },
];

export const demoCompanies: Company[] = [
  {
    id: "company-mirai",
    organizationId: "org-mirai",
    companyCode: "DEMO-MFG-001",
    securityCode: "DEMO-1001",
    name: "日本未来製造株式会社",
    nameEn: "Japan Future Manufacturing Demo Co., Ltd.",
    industry: "manufacturing",
    marketSegment: "demo_prime",
    size: "large",
    fiscalYearEndMonth: 3,
    terrastExternalId: "terrast-mock-company-001",
    sharingConsent: "individual_consented",
    isSynthetic: true,
  },
  {
    id: "company-next-retail",
    organizationId: "org-next-retail",
    companyCode: "DEMO-RTL-002",
    securityCode: "DEMO-2002",
    name: "ネクストリテール株式会社",
    nameEn: "Next Retail Demo Co., Ltd.",
    industry: "retail",
    marketSegment: "demo_standard",
    size: "large",
    fiscalYearEndMonth: 2,
    terrastExternalId: "terrast-mock-company-002",
    sharingConsent: "aggregated_only",
    isSynthetic: true,
  },
  {
    id: "company-green-tech",
    organizationId: "org-green-tech",
    companyCode: "DEMO-ITS-003",
    securityCode: "DEMO-3003",
    name: "グリーンテックサービス株式会社",
    nameEn: "Green Tech Services Demo Co., Ltd.",
    industry: "information_services",
    marketSegment: "demo_growth",
    size: "medium",
    fiscalYearEndMonth: 3,
    terrastExternalId: "terrast-mock-company-003",
    sharingConsent: "aggregated_only",
    isSynthetic: true,
  },
];

export const demoMetrics: MetricDefinition[] = [
  {
    code: "revenue_million_jpy",
    name: "売上高",
    description: "連結売上高（デモ）",
    category: "target_performance",
    valueType: "number",
    canonicalUnit: "million_JPY",
    allowedUnits: ["million_JPY", "JPY"],
    isRequired: true,
    isSensitive: true,
    terrastFieldKey: "demo.revenue",
  },
  {
    code: "scope_1_emissions",
    name: "Scope 1排出量",
    description: "直接GHG排出量",
    category: "ghg_emissions",
    valueType: "number",
    canonicalUnit: "tCO2e",
    allowedUnits: ["tCO2e", "kgCO2e"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.ghg.scope1",
  },
  {
    code: "scope_2_location_emissions",
    name: "Scope 2（ロケーション基準）",
    description: "購入エネルギー由来排出量（ロケーション基準）",
    category: "ghg_emissions",
    valueType: "number",
    canonicalUnit: "tCO2e",
    allowedUnits: ["tCO2e", "kgCO2e"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.ghg.scope2.location",
  },
  {
    code: "scope_2_market_emissions",
    name: "Scope 2（マーケット基準）",
    description: "購入エネルギー由来排出量（マーケット基準）",
    category: "ghg_emissions",
    valueType: "number",
    canonicalUnit: "tCO2e",
    allowedUnits: ["tCO2e", "kgCO2e"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.ghg.scope2.market",
  },
  {
    code: "scope_3_emissions",
    name: "Scope 3排出量",
    description: "バリューチェーン排出量（デモ推計を含む）",
    category: "ghg_emissions",
    valueType: "number",
    canonicalUnit: "tCO2e",
    allowedUnits: ["tCO2e", "kgCO2e"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.ghg.scope3",
  },
  {
    code: "energy_consumption",
    name: "エネルギー消費量",
    description: "組織境界内のエネルギー消費",
    category: "energy",
    valueType: "number",
    canonicalUnit: "MWh",
    allowedUnits: ["MWh", "kWh", "GJ", "TJ"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.energy.total",
  },
  {
    code: "renewable_energy_ratio",
    name: "再生可能エネルギー比率",
    description: "エネルギー消費に占める再生可能エネルギー比率",
    category: "energy",
    valueType: "number",
    canonicalUnit: "percent",
    allowedUnits: ["percent", "ratio"],
    isRequired: false,
    isSensitive: false,
    terrastFieldKey: "demo.energy.renewable_ratio",
  },
  {
    code: "water_withdrawal",
    name: "取水量",
    description: "総取水量",
    category: "water",
    valueType: "number",
    canonicalUnit: "m3",
    allowedUnits: ["m3", "L"],
    isRequired: false,
    isSensitive: false,
    terrastFieldKey: "demo.water.withdrawal",
  },
  {
    code: "waste_generated",
    name: "廃棄物発生量",
    description: "廃棄物の総発生量",
    category: "waste",
    valueType: "number",
    canonicalUnit: "t",
    allowedUnits: ["t", "kg"],
    isRequired: false,
    isSensitive: false,
    terrastFieldKey: "demo.waste.generated",
  },
  {
    code: "employee_count",
    name: "従業員数",
    description: "期末従業員数",
    category: "employees",
    valueType: "number",
    canonicalUnit: "people",
    allowedUnits: ["people"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.people.employees",
  },
  {
    code: "training_hours_total",
    name: "研修時間",
    description: "年間研修時間の合計",
    category: "human_capital",
    valueType: "number",
    canonicalUnit: "hours",
    allowedUnits: ["hours"],
    isRequired: false,
    isSensitive: false,
    terrastFieldKey: "demo.people.training_hours",
  },
  {
    code: "female_management_ratio",
    name: "女性管理職比率",
    description: "管理職に占める女性の割合",
    category: "diversity",
    valueType: "number",
    canonicalUnit: "percent",
    allowedUnits: ["percent", "ratio"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.people.female_management",
  },
  {
    code: "lost_time_injury_frequency_rate",
    name: "休業災害度数率",
    description: "デモ用の労働安全指標",
    category: "occupational_safety",
    valueType: "number",
    canonicalUnit: "ratio",
    allowedUnits: ["ratio"],
    isRequired: false,
    isSensitive: false,
    terrastFieldKey: "demo.safety.ltifr",
  },
  {
    code: "supplier_primary_data_coverage",
    name: "サプライヤー一次データ充足率",
    description: "Scope 3対象に占める一次データの割合",
    category: "supply_chain",
    valueType: "number",
    canonicalUnit: "percent",
    allowedUnits: ["percent", "ratio"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.supply.primary_data",
  },
  {
    code: "climate_risk_summary",
    name: "主要な気候リスク",
    description: "短い独自要約",
    category: "risk_opportunity",
    valueType: "text",
    canonicalUnit: "unitless",
    allowedUnits: ["unitless"],
    isRequired: true,
    isSensitive: true,
    terrastFieldKey: "demo.climate.risk_summary",
  },
  {
    code: "board_climate_oversight",
    name: "取締役会の気候監督",
    description: "取締役会で気候課題を監督しているか",
    category: "governance",
    valueType: "boolean",
    canonicalUnit: "unitless",
    allowedUnits: ["unitless"],
    isRequired: true,
    isSensitive: false,
    terrastFieldKey: "demo.governance.board_oversight",
  },
  {
    code: "transition_action_progress",
    name: "移行施策進捗",
    description: "主要移行施策の平均進捗",
    category: "target_performance",
    valueType: "number",
    canonicalUnit: "percent",
    allowedUnits: ["percent", "ratio"],
    isRequired: true,
    isSensitive: true,
    terrastFieldKey: "demo.transition.progress",
  },
  {
    code: "environmental_incident_count",
    name: "環境インシデント件数",
    description: "当該年度の環境インシデント件数（デモ）",
    category: "environment",
    valueType: "number",
    canonicalUnit: "unitless",
    allowedUnits: ["unitless"],
    isRequired: false,
    isSensitive: true,
    terrastFieldKey: "demo.environment.incidents",
  },
];

const companyYearData: Record<string, Array<Record<string, MetricScalar>>> = {
  "company-mirai": [
    {
      revenue_million_jpy: 480_000,
      scope_1_emissions: 13_200,
      scope_2_location_emissions: 18_700,
      scope_2_market_emissions: 17_900,
      scope_3_emissions: 72_000,
      energy_consumption: 82_000,
      renewable_energy_ratio: 18,
      water_withdrawal: 410_000,
      waste_generated: 8_200,
      employee_count: 7_800,
      training_hours_total: 93_600,
      female_management_ratio: 12,
      lost_time_injury_frequency_rate: 0.72,
      supplier_primary_data_coverage: 24,
      climate_risk_summary: "高温と調達網の変動を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 18,
      environmental_incident_count: 3,
    },
    {
      revenue_million_jpy: 505_000,
      scope_1_emissions: 12_700,
      scope_2_location_emissions: 17_900,
      scope_2_market_emissions: 16_500,
      scope_3_emissions: 74_000,
      energy_consumption: 80_500,
      renewable_energy_ratio: 24,
      water_withdrawal: 398_000,
      waste_generated: 7_850,
      employee_count: 7_950,
      training_hours_total: 103_350,
      female_management_ratio: 14,
      lost_time_injury_frequency_rate: 0.61,
      supplier_primary_data_coverage: 31,
      climate_risk_summary:
        "高温、調達網の変動、炭素コストを主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 29,
      environmental_incident_count: 2,
    },
    {
      revenue_million_jpy: 528_000,
      scope_1_emissions: 12_100,
      scope_2_location_emissions: 17_200,
      scope_2_market_emissions: 15_100,
      scope_3_emissions: 76_000,
      energy_consumption: 79_000,
      renewable_energy_ratio: 31,
      water_withdrawal: 386_000,
      waste_generated: 7_420,
      employee_count: 8_100,
      training_hours_total: 113_400,
      female_management_ratio: 16,
      lost_time_injury_frequency_rate: 0.53,
      supplier_primary_data_coverage: null,
      climate_risk_summary:
        "高温、重要部材の供給変動、炭素コストを主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 38,
      environmental_incident_count: 1,
    },
  ],
  "company-next-retail": [
    {
      revenue_million_jpy: 310_000,
      scope_1_emissions: 4_800,
      scope_2_location_emissions: 22_000,
      scope_2_market_emissions: 21_500,
      scope_3_emissions: 180_000,
      energy_consumption: 96_000,
      renewable_energy_ratio: 12,
      water_withdrawal: 180_000,
      waste_generated: 15_500,
      employee_count: 12_500,
      training_hours_total: 125_000,
      female_management_ratio: 21,
      lost_time_injury_frequency_rate: 0.44,
      supplier_primary_data_coverage: 9,
      climate_risk_summary:
        "物流途絶と商品調達価格の変動を主要なデモリスクとして整理",
      board_climate_oversight: false,
      transition_action_progress: 8,
      environmental_incident_count: 4,
    },
    {
      revenue_million_jpy: 326_000,
      scope_1_emissions: 4_650,
      scope_2_location_emissions: 21_200,
      scope_2_market_emissions: 20_100,
      scope_3_emissions: 187_000,
      energy_consumption: 94_500,
      renewable_energy_ratio: 17,
      water_withdrawal: 176_000,
      waste_generated: 15_100,
      employee_count: 12_900,
      training_hours_total: 141_900,
      female_management_ratio: 23,
      lost_time_injury_frequency_rate: 0.4,
      supplier_primary_data_coverage: 13,
      climate_risk_summary:
        "物流途絶、商品調達価格、廃棄規制の変動を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 15,
      environmental_incident_count: 3,
    },
    {
      revenue_million_jpy: 342_000,
      scope_1_emissions: 4_500,
      scope_2_location_emissions: 20_400,
      scope_2_market_emissions: 18_700,
      scope_3_emissions: 193_000,
      energy_consumption: 92_800,
      renewable_energy_ratio: 23,
      water_withdrawal: 171_000,
      waste_generated: 14_600,
      employee_count: 13_300,
      training_hours_total: 159_600,
      female_management_ratio: 25,
      lost_time_injury_frequency_rate: 0.37,
      supplier_primary_data_coverage: 18,
      climate_risk_summary:
        "物流途絶、商品調達価格、廃棄規制の変動を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 22,
      environmental_incident_count: 2,
    },
  ],
  "company-green-tech": [
    {
      revenue_million_jpy: 68_000,
      scope_1_emissions: 620,
      scope_2_location_emissions: 3_200,
      scope_2_market_emissions: 2_900,
      scope_3_emissions: 8_500,
      energy_consumption: 15_000,
      renewable_energy_ratio: 38,
      water_withdrawal: 22_000,
      waste_generated: 310,
      employee_count: 2_100,
      training_hours_total: 63_000,
      female_management_ratio: 31,
      lost_time_injury_frequency_rate: 0.08,
      supplier_primary_data_coverage: 46,
      climate_risk_summary:
        "データセンターの電力制約と人材確保を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 35,
      environmental_incident_count: 0,
    },
    {
      revenue_million_jpy: 75_000,
      scope_1_emissions: 590,
      scope_2_location_emissions: 3_050,
      scope_2_market_emissions: 2_500,
      scope_3_emissions: 8_900,
      energy_consumption: 15_400,
      renewable_energy_ratio: 49,
      water_withdrawal: 21_500,
      waste_generated: 295,
      employee_count: 2_280,
      training_hours_total: 72_960,
      female_management_ratio: 34,
      lost_time_injury_frequency_rate: 0.06,
      supplier_primary_data_coverage: 53,
      climate_risk_summary:
        "データセンターの電力制約、自然災害、人材確保を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 48,
      environmental_incident_count: 0,
    },
    {
      revenue_million_jpy: 84_000,
      scope_1_emissions: 560,
      scope_2_location_emissions: 2_900,
      scope_2_market_emissions: 2_050,
      scope_3_emissions: 9_100,
      energy_consumption: 15_900,
      renewable_energy_ratio: 62,
      water_withdrawal: 21_000,
      waste_generated: 280,
      employee_count: 2_450,
      training_hours_total: 83_300,
      female_management_ratio: 37,
      lost_time_injury_frequency_rate: 0.05,
      supplier_primary_data_coverage: 61,
      climate_risk_summary:
        "データセンターの電力制約、自然災害、人材確保を主要なデモリスクとして整理",
      board_climate_oversight: true,
      transition_action_progress: 61,
      environmental_incident_count: 0,
    },
  ],
};

const periodFor = (company: Company, fiscalYear: number): ReportingPeriod => {
  const endMonth = company.fiscalYearEndMonth;
  const endYear = endMonth === 12 ? fiscalYear : fiscalYear + 1;
  const startMonth = (endMonth % 12) + 1;
  const startYear = startMonth === 1 ? fiscalYear : fiscalYear;
  const endDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  return {
    id: `period-${company.id}-fy${fiscalYear}`,
    companyId: company.id,
    fiscalYear,
    startDate: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    endDate: `${endYear}-${String(endMonth).padStart(2, "0")}-${endDay}`,
    label: `FY${fiscalYear}`,
    status: fiscalYear === 2025 ? "open" : "closed",
  };
};

export const demoReportingPeriods = demoCompanies.flatMap((company) =>
  DEMO_FISCAL_YEARS.map((year) => periodFor(company, year)),
);

const metricValueFor = (
  company: Company,
  period: ReportingPeriod,
  metric: MetricDefinition,
  value: Exclude<MetricScalar, null>,
): MetricValue => {
  const common = {
    id: `metric-value-${company.id}-fy${period.fiscalYear}-${metric.code}`,
    companyId: company.id,
    metricCode: metric.code,
    reportingPeriodId: period.id,
    reportingPeriod: period.label,
    unit: metric.canonicalUnit,
    originalUnit: metric.canonicalUnit,
    consolidationScope: "consolidated",
    organizationalBoundary: "operational_control",
    sourceType: "terrast" as const,
    sourceSystem: "TERRAST_MOCK",
    sourceRecordId: `terrast-mock-${company.companyCode}-${period.label}-${metric.code}`,
    sourceDocument: metric.code.includes("scope_")
      ? `DEMO_${company.companyCode}_FY${period.fiscalYear}_GHG_summary.pdf`
      : null,
    importedAt: `${period.fiscalYear + 1}-06-30T00:00:00.000Z`,
    lastUpdatedAt: `${period.fiscalYear + 1}-06-30T00:00:00.000Z`,
    confidenceLevel:
      metric.code === "scope_3_emissions" ||
      metric.code === "supplier_primary_data_coverage"
        ? ("medium" as const)
        : ("high" as const),
    verificationStatus:
      period.fiscalYear < 2025
        ? ("internally_reviewed" as const)
        : ("unverified" as const),
    ownerId: "user-preparer",
    reviewerId: "user-reviewer",
    evidenceIds: metric.code.includes("scope_")
      ? [`evidence-${company.id}-fy${period.fiscalYear}-ghg`]
      : [],
    changeReason: null,
    manualOverride: false,
    version: 1,
  };

  if (metric.valueType === "number" && typeof value === "number") {
    return {
      ...common,
      valueType: "number",
      value,
      originalValue: value,
      normalizedValue: value,
    };
  }
  if (metric.valueType === "text" && typeof value === "string") {
    return {
      ...common,
      valueType: "text",
      value,
      originalValue: value,
      normalizedValue: value,
    };
  }
  if (metric.valueType === "boolean" && typeof value === "boolean") {
    return {
      ...common,
      valueType: "boolean",
      value,
      originalValue: value,
      normalizedValue: value,
    };
  }
  throw new TypeError(`Seed value type does not match ${metric.code}.`);
};

export const demoMetricValues: MetricValue[] = demoCompanies.flatMap(
  (company) => {
    const yearly = companyYearData[company.id];
    if (!yearly)
      throw new Error(`Missing synthetic profile for ${company.id}.`);
    return DEMO_FISCAL_YEARS.flatMap((fiscalYear, yearIndex) => {
      const period = demoReportingPeriods.find(
        (candidate) =>
          candidate.companyId === company.id &&
          candidate.fiscalYear === fiscalYear,
      );
      if (!period)
        throw new Error(
          `Missing reporting period ${company.id} FY${fiscalYear}.`,
        );
      const data = yearly[yearIndex];
      if (!data)
        throw new Error(
          `Missing synthetic values ${company.id} FY${fiscalYear}.`,
        );
      return demoMetrics.flatMap((metric) => {
        const value = data[metric.code];
        return value === null || value === undefined
          ? []
          : [metricValueFor(company, period, metric, value)];
      });
    });
  },
);

// Create one explicit manual override so the mock sync can demonstrate conflict resolution.
const conflictIndex = demoMetricValues.findIndex(
  (value) =>
    value.companyId === "company-mirai" &&
    value.reportingPeriod === "FY2025" &&
    value.metricCode === "scope_3_emissions",
);
if (conflictIndex >= 0) {
  const current = demoMetricValues[conflictIndex];
  if (current?.valueType === "number") {
    demoMetricValues[conflictIndex] = {
      ...current,
      sourceType: "manual",
      sourceSystem: "MANUAL_ENTRY",
      sourceRecordId: "manual-company-mirai-fy2025-scope3",
      manualOverride: true,
      changeReason: "担当部署の暫定集計値を優先（デモ）",
      version: 2,
    };
  }
}

export const demoFrameworks: Framework[] = [
  [
    "framework-ssbj-application",
    "SSBJ_APPLICATION",
    "SSBJ サステナビリティ開示基準の適用",
    "https://www.ssb-j.jp/jp/",
  ],
  [
    "framework-ssbj-general",
    "SSBJ_GENERAL",
    "SSBJ 一般開示基準",
    "https://www.ssb-j.jp/jp/",
  ],
  [
    "framework-ssbj-climate",
    "SSBJ_CLIMATE",
    "SSBJ 気候関連開示基準",
    "https://www.ssb-j.jp/jp/",
  ],
  [
    "framework-ssbj-implementation",
    "SSBJ_IMPLEMENTATION",
    "SSBJ 実務対応基準",
    "https://www.ssb-j.jp/jp/",
  ],
  ["framework-ifrs-s1", "IFRS_S1", "ISSB IFRS S1", "https://www.ifrs.org/"],
  ["framework-ifrs-s2", "IFRS_S2", "ISSB IFRS S2", "https://www.ifrs.org/"],
].map(([id, code, name, referenceUrl]) => ({
  id,
  code: code as Framework["code"],
  name,
  referenceUrl,
}));

export const demoFrameworkVersions: FrameworkVersion[] = demoFrameworks.map(
  (framework) => ({
    id: `version-${framework.id}-concept-v1`,
    frameworkId: framework.id,
    version: "concept-mvp-v1",
    effectiveDate: "2025-04-01",
    status: "current",
  }),
);

const requirementSeed: Array<[string, string, string[], number]> = [
  [
    "DEMO-GEN-01",
    "重要なサステナビリティ関連情報の管理体制を説明する。",
    ["board_climate_oversight"],
    1,
  ],
  [
    "DEMO-CLI-01",
    "Scope 1・2・3排出量と算定範囲を説明する。",
    [
      "scope_1_emissions",
      "scope_2_location_emissions",
      "scope_2_market_emissions",
      "scope_3_emissions",
    ],
    2,
  ],
  [
    "DEMO-CLI-02",
    "主要な気候リスクと対応を説明する。",
    ["climate_risk_summary"],
    1.5,
  ],
  [
    "DEMO-TRN-01",
    "移行目標、施策、進捗を説明する。",
    ["transition_action_progress", "renewable_energy_ratio"],
    1.5,
  ],
  [
    "DEMO-SUP-01",
    "Scope 3一次データの収集状況を説明する。",
    ["supplier_primary_data_coverage"],
    1,
  ],
  [
    "DEMO-HUM-01",
    "人的資本と多様性に関する主要指標を説明する。",
    ["employee_count", "training_hours_total", "female_management_ratio"],
    1,
  ],
];

export const demoDisclosureRequirements: DisclosureRequirement[] =
  requirementSeed.map(([code, summary, , weight], index) => ({
    id: `requirement-${code.toLowerCase()}`,
    frameworkVersionId:
      demoFrameworkVersions[index % demoFrameworkVersions.length]?.id ??
      demoFrameworkVersions[0]!.id,
    requirementCode: code,
    summary,
    referenceUrl:
      index < 4 ? "https://www.ssb-j.jp/jp/" : "https://www.ifrs.org/",
    applicableFrom: "2025-04-01",
    status: "active",
    weight,
  }));

export const demoRequirementMappings: RequirementMapping[] =
  requirementSeed.map(([code, , metricCodes]) => ({
    id: `mapping-${code.toLowerCase()}`,
    requirementId: `requirement-${code.toLowerCase()}`,
    metricCodes,
    mappingType: "required",
  }));

export const demoEmissionFactors: EmissionFactor[] = [
  {
    id: "factor-demo-fuel",
    name: "デモ燃料係数",
    factorValue: 0.071,
    activityUnit: "GJ",
    emissionUnit: "tCO2e",
    geography: "DEMO-JP",
    factorYear: 2025,
    version: "demo-v1",
    sourceLabel: "DEMO DATA — 合成燃料係数",
    isDemo: true,
  },
  {
    id: "factor-demo-electricity-location",
    name: "デモ電力係数（ロケーション基準）",
    factorValue: 0.00045,
    activityUnit: "kWh",
    emissionUnit: "tCO2e",
    geography: "DEMO-JP",
    factorYear: 2025,
    version: "demo-v1",
    sourceLabel: "DEMO DATA — 合成電力係数",
    isDemo: true,
  },
  {
    id: "factor-demo-electricity-market",
    name: "デモ電力係数（マーケット基準）",
    factorValue: 0.00032,
    activityUnit: "kWh",
    emissionUnit: "tCO2e",
    geography: "DEMO-JP",
    factorYear: 2025,
    version: "demo-v1",
    sourceLabel: "DEMO DATA — 合成電力係数",
    isDemo: true,
  },
];

const calculationFor = (
  company: Company,
  scope: "scope_1" | "scope_2",
  factor: EmissionFactor,
  activityValue: number,
  basis?: "location_based" | "market_based",
): CalculationRecord => {
  const period = demoReportingPeriods.find(
    (candidate) =>
      candidate.companyId === company.id && candidate.fiscalYear === 2025,
  )!;
  const result = calculateGhgEmissions({
    activity: { value: activityValue, unit: factor.activityUnit },
    emissionFactor: factor,
    scope,
    ...(basis ? { scope2Basis: basis } : {}),
    isEstimated: true,
  });
  return {
    id: `calculation-${company.id}-${scope}-${basis ?? "direct"}`,
    companyId: company.id,
    reportingPeriodId: period.id,
    scope,
    ...(basis ? { scope2Basis: basis } : {}),
    activity: result.normalizedActivity,
    emissionFactorId: factor.id,
    emissions: result.emissions,
    formula: result.formula,
    methodology: result.methodologyLabel,
    isEstimated: true,
    calculatedAt: DEMO_DATASET_TIMESTAMP,
  };
};

export const demoCalculationRecords: CalculationRecord[] =
  demoCompanies.flatMap((company, index) => [
    calculationFor(
      company,
      "scope_1",
      demoEmissionFactors[0]!,
      [170_000, 63_000, 7_900][index]!,
    ),
    calculationFor(
      company,
      "scope_2",
      demoEmissionFactors[1]!,
      [38_200_000, 45_300_000, 6_440_000][index]!,
      "location_based",
    ),
    calculationFor(
      company,
      "scope_2",
      demoEmissionFactors[2]!,
      [47_180_000, 58_430_000, 6_406_250][index]!,
      "market_based",
    ),
  ]);

const responseStatuses: DisclosureResponse["status"][] = [
  "approved",
  "revision_requested",
  "drafted",
  "data_available",
  "not_started",
  "in_review",
];
export const demoDisclosureResponses: DisclosureResponse[] =
  demoCompanies.flatMap((company, companyIndex) => {
    const period = demoReportingPeriods.find(
      (candidate) =>
        candidate.companyId === company.id && candidate.fiscalYear === 2025,
    )!;
    return demoDisclosureRequirements.map((requirement, requirementIndex) => ({
      id: `response-${company.id}-${requirement.requirementCode.toLowerCase()}`,
      companyId: company.id,
      reportingPeriodId: period.id,
      requirementId: requirement.id,
      status:
        responseStatuses[
          (companyIndex + requirementIndex) % responseStatuses.length
        ]!,
      responseText:
        requirementIndex < 2
          ? `${company.name}の合成デモデータに基づく開示文案。要レビュー。`
          : "",
      sourceMetricValueIds: demoMetricValues
        .filter(
          (value) =>
            value.companyId === company.id &&
            value.reportingPeriodId === period.id,
        )
        .filter((value) =>
          demoRequirementMappings
            .find((mapping) => mapping.requirementId === requirement.id)
            ?.metricCodes.includes(value.metricCode),
        )
        .map((value) => value.id),
      evidenceIds:
        requirement.requirementCode === "DEMO-CLI-01"
          ? [`evidence-${company.id}-fy2025-ghg`]
          : [],
      ownerId: "user-preparer",
      reviewerId: "user-reviewer",
      lastUpdatedBy: "user-preparer",
      lastUpdatedAt: DEMO_DATASET_TIMESTAMP,
      version: 1,
    }));
  });

export const demoMarketplaceOfferings: MarketplaceOffering[] = [
  {
    id: "offering-demo-carbon-ops",
    name: "カーボン業務改善デモパック",
    providerName: "架空・青葉ソリューション",
    category: "decarbonization",
    description: "排出ホットスポットの可視化と施策整理を支援する架空サービス。",
    supportedIndustries: ["manufacturing", "retail"],
    supportedHotspots: ["scope_1", "scope_2"],
    supportedGapCodes: ["GHG_METHOD"],
    relatedActionKeywords: ["省エネ", "再エネ"],
    isSynthetic: true,
    termsDisclaimer: "架空のデモサービスです。実在の提供条件ではありません。",
  },
  {
    id: "offering-demo-scope3",
    name: "サプライチェーン対話デモ支援",
    providerName: "架空・循環データ研究所",
    category: "disclosure_support",
    description: "Scope 3一次データ収集を支援する架空サービス。",
    supportedIndustries: ["manufacturing", "retail"],
    supportedHotspots: ["scope_3"],
    supportedGapCodes: ["SUPPLIER_DATA", "SCOPE3_COVERAGE"],
    relatedActionKeywords: ["サプライヤー", "調達"],
    isSynthetic: true,
    termsDisclaimer: "架空のデモサービスです。実在の提供条件ではありません。",
  },
  {
    id: "offering-demo-assurance",
    name: "証憑整備レビュー・デモ",
    providerName: "架空・みらい保証デモ事務所",
    category: "assurance",
    description: "証憑と計算過程の整備状況を確認する架空サービス。",
    supportedIndustries: [
      "manufacturing",
      "retail",
      "information_services",
      "other",
    ],
    supportedHotspots: ["disclosure"],
    supportedGapCodes: ["EVIDENCE", "REVIEW"],
    relatedActionKeywords: ["証憑", "保証"],
    isSynthetic: true,
    termsDisclaimer:
      "架空のデモサービスです。保証業務や保証意見を提供するものではありません。",
  },
  {
    id: "offering-demo-learning",
    name: "開示実務ラーニング・デモ",
    providerName: "架空・未来開示アカデミー",
    category: "education",
    description: "初学者向けの架空研修プログラム。",
    supportedIndustries: [
      "manufacturing",
      "retail",
      "information_services",
      "other",
    ],
    supportedHotspots: ["human_capital", "disclosure"],
    supportedGapCodes: ["KNOWLEDGE"],
    relatedActionKeywords: ["研修", "教育"],
    isSynthetic: true,
    termsDisclaimer: "架空のデモサービスです。",
  },
  {
    id: "offering-demo-finance",
    name: "移行投資整理デモ相談",
    providerName: "架空・グリーン資本デザイン",
    category: "green_finance",
    description: "移行施策と投資計画の整理を支援する架空サービス。",
    supportedIndustries: ["manufacturing", "retail", "information_services"],
    supportedHotspots: ["transition"],
    supportedGapCodes: ["TRANSITION_CAPEX"],
    relatedActionKeywords: ["投資", "設備"],
    isSynthetic: true,
    termsDisclaimer:
      "架空のデモサービスです。融資・金融商品の実在条件を示しません。",
  },
  {
    id: "offering-demo-subsidy",
    name: "制度探索デモナビ",
    providerName: "架空・地域脱炭素案内所",
    category: "subsidy_support",
    description: "候補制度の確認観点を整理する架空サービス。",
    supportedIndustries: [
      "manufacturing",
      "retail",
      "information_services",
      "other",
    ],
    supportedHotspots: ["scope_1", "scope_2", "transition"],
    supportedGapCodes: ["FUNDING"],
    relatedActionKeywords: ["設備", "再エネ"],
    isSynthetic: true,
    termsDisclaimer:
      "架空のデモサービスです。実在制度の採択や適用を保証しません。",
  },
];

const baseDataset: DemoDataset = {
  schemaVersion: 1,
  generatedAt: DEMO_DATASET_TIMESTAMP,
  datasetLabel: "SYNTHETIC DEMO DATA",
  isSynthetic: true,
  organizations: demoOrganizations,
  users: demoUsers,
  organizationMembers: [
    {
      id: "member-system",
      organizationId: "org-system",
      userId: "user-system-admin",
      role: "system_admin",
      companyIds: [],
      assignedResourceIds: [],
      active: true,
    },
    {
      id: "member-platform",
      organizationId: "org-platform",
      userId: "user-platform",
      role: "platform_operator_demo_admin",
      companyIds: [],
      assignedResourceIds: [],
      active: true,
    },
    {
      id: "member-company-admin",
      organizationId: "org-mirai",
      userId: "user-company-admin",
      role: "company_admin",
      companyIds: ["company-mirai"],
      assignedResourceIds: [],
      active: true,
    },
    {
      id: "member-preparer",
      organizationId: "org-mirai",
      userId: "user-preparer",
      role: "preparer",
      companyIds: ["company-mirai"],
      assignedResourceIds: [],
      active: true,
    },
    {
      id: "member-reviewer",
      organizationId: "org-mirai",
      userId: "user-reviewer",
      role: "reviewer_approver",
      companyIds: ["company-mirai"],
      assignedResourceIds: [],
      active: true,
    },
    {
      id: "member-assurer",
      organizationId: "org-assurance",
      userId: "user-assurer",
      role: "external_assurer_read_only",
      companyIds: ["company-mirai"],
      assignedResourceIds: [
        "response-company-mirai-demo-cli-01",
        "evidence-company-mirai-fy2025-ghg",
      ],
      active: true,
    },
    {
      id: "member-supplier",
      organizationId: "org-supplier",
      userId: "user-supplier",
      role: "supplier_user",
      companyIds: [],
      assignedResourceIds: ["supplier-request-mirai-001"],
      active: true,
    },
  ],
  companies: demoCompanies,
  companySharingConsents: [
    {
      id: "consent-mirai-platform",
      companyId: "company-mirai",
      granteeOrganizationId: "org-platform",
      scope: "individual_detail",
      metricCodes: [
        "scope_1_emissions",
        "scope_2_location_emissions",
        "scope_3_emissions",
      ],
      grantedBy: "user-company-admin",
      grantedAt: "2025-07-01T00:00:00.000Z",
      expiresAt: "2027-03-31T23:59:59.000Z",
    },
  ],
  reportingPeriods: demoReportingPeriods,
  frameworks: demoFrameworks,
  frameworkVersions: demoFrameworkVersions,
  disclosureRequirements: demoDisclosureRequirements,
  requirementMappings: demoRequirementMappings,
  metrics: demoMetrics,
  metricValues: demoMetricValues,
  emissionFactors: demoEmissionFactors,
  calculationRecords: demoCalculationRecords,
  evidenceFiles: demoCompanies.flatMap((company) =>
    DEMO_FISCAL_YEARS.map((year) => ({
      id: `evidence-${company.id}-fy${year}-ghg`,
      companyId: company.id,
      fileName: `DEMO_${company.companyCode}_FY${year}_GHG_summary.pdf`,
      contentType: "application/pdf",
      sizeBytes: 12_345,
      storagePath: `synthetic/${company.id}/fy${year}/ghg-summary.pdf`,
      uploadedBy: "user-preparer",
      uploadedAt: `${year + 1}-06-30T00:00:00.000Z`,
      checksumSha256:
        "d3b07384d113edec49eaa6238ad5ff00d9a4a2a548e798c07901e5e43f2c8f4d",
      status: "available",
      isSynthetic: true,
    })),
  ),
  disclosureResponses: demoDisclosureResponses,
  disclosureDrafts: [
    {
      id: "draft-mirai-climate",
      responseId: "response-company-mirai-demo-cli-01",
      text: "合成データに基づくAI提案・要レビューの文案。",
      source: "ai_suggestion",
      evidenceMetricValueIds: [
        "metric-value-company-mirai-fy2025-scope_1_emissions",
        "metric-value-company-mirai-fy2025-scope_2_location_emissions",
      ],
      createdBy: "user-preparer",
      createdAt: DEMO_DATASET_TIMESTAMP,
      promptVersion: "demo-prompt-v1",
      model: "deterministic-demo",
    },
  ],
  reviewTasks: [
    {
      id: "review-mirai-climate",
      responseId: "response-company-mirai-demo-cli-01",
      assignedTo: "user-reviewer",
      status: "revision_requested",
      dueDate: "2026-02-15",
      createdBy: "user-preparer",
      createdAt: DEMO_DATASET_TIMESTAMP,
      completedAt: "2026-01-20T00:00:00.000Z",
    },
  ],
  reviewComments: [
    {
      id: "comment-mirai-climate",
      reviewTaskId: "review-mirai-climate",
      authorId: "user-reviewer",
      body: "Scope 3の推計範囲と一次データ充足率を補足してください（デモ）。",
      mentionedUserIds: ["user-preparer"],
      createdAt: "2026-01-20T00:00:00.000Z",
    },
  ],
  approvals: [
    {
      id: "approval-mirai-general",
      responseId: "response-company-mirai-demo-gen-01",
      approverId: "user-reviewer",
      status: "approved",
      reason: "デモレビュー完了",
      approvedAt: "2026-01-14T00:00:00.000Z",
    },
  ],
  risksOpportunities: demoCompanies.flatMap((company, index) => [
    {
      id: `risk-${company.id}-physical`,
      companyId: company.id,
      title: "極端気象による事業継続リスク（デモ）",
      description: "合成シナリオ上の物理的リスク。",
      type: "physical_risk" as const,
      likelihood: (3 + (index % 2)) as 3 | 4,
      impact: (3 + (index === 0 ? 1 : 0)) as 3 | 4,
      timeHorizon: "medium" as const,
      affectedBusiness: "主要事業（デモ）",
      financialImpactDirection: "negative" as const,
      response: "BCPと調達代替策を更新する（デモ）",
      ownerId: "user-company-admin",
      oversight: "経営会議で四半期確認（デモ）",
      status: "mitigating" as const,
    },
    {
      id: `opportunity-${company.id}-efficiency`,
      companyId: company.id,
      title: "省エネ型サービス機会（デモ）",
      description: "合成シナリオ上の気候機会。",
      type: "opportunity" as const,
      likelihood: 3 as const,
      impact: 3 as const,
      timeHorizon: "medium" as const,
      affectedBusiness: "成長領域（デモ）",
      financialImpactDirection: "positive" as const,
      response: "顧客価値仮説を検証する（デモ）",
      ownerId: "user-company-admin",
      oversight: "取締役会へ半期報告（デモ）",
      status: "assessed" as const,
    },
  ]),
  transitionTargets: demoCompanies.map((company, index) => ({
    id: `target-${company.id}-ghg`,
    companyId: company.id,
    title: "GHG排出削減デモ目標",
    metricCode: "scope_1_emissions",
    baselineYear: 2023,
    baselineValue: [13_200, 4_800, 620][index]!,
    targetYear: 2030,
    targetValue: [8_000, 3_000, 350][index]!,
    unit: "tCO2e",
    progressValue: [12_100, 4_500, 560][index]!,
    status: index === 1 ? "at_risk" : "on_track",
  })),
  transitionActions: demoCompanies.map((company, index) => ({
    id: `action-${company.id}-energy`,
    companyId: company.id,
    targetId: `target-${company.id}-ghg`,
    relatedRiskOpportunityIds: [
      `risk-${company.id}-physical`,
      `opportunity-${company.id}-efficiency`,
    ],
    title: "省エネ・再エネ施策（デモ）",
    description: "架空の設備改善と調達施策。",
    ownerId: "user-company-admin",
    kpi: "transition_action_progress",
    baselineYear: 2023,
    targetYear: 2030,
    targetValue: 100,
    progressPercent: [38, 22, 61][index]!,
    investmentType: index === 2 ? "opex" : "both",
    investmentAmountMillionJpy: [8_000, 3_500, 450][index]!,
    oversightStatus: "経営会議で進捗確認（デモ）",
    status: "in_progress",
  })),
  supplierRequests: [
    {
      id: "supplier-request-mirai-001",
      companyId: "company-mirai",
      supplierOrganizationId: "org-supplier",
      metricCodes: ["scope_3_emissions", "supplier_primary_data_coverage"],
      scope3Categories: [1, 4],
      dueDate: "2026-03-31",
      invitationToken: "demo-invitation-token-not-secret",
      status: "submitted",
      createdBy: "user-preparer",
      createdAt: DEMO_DATASET_TIMESTAMP,
    },
  ],
  supplierResponses: [
    {
      id: "supplier-response-mirai-001",
      requestId: "supplier-request-mirai-001",
      respondentId: "user-supplier",
      values: [
        {
          metricCode: "scope_3_emissions",
          value: 1_250,
          unit: "tCO2e",
          isEstimated: true,
          evidenceIds: [],
        },
      ],
      status: "submitted",
      submittedAt: "2026-01-18T00:00:00.000Z",
    },
  ],
  marketplaceOfferings: demoMarketplaceOfferings,
  terrastSyncJobs: [
    {
      id: "sync-job-initial-mirai",
      companyId: "company-mirai",
      requestedBy: "user-preparer",
      mode: "apply",
      status: "completed",
      idempotencyKey: "seed-initial-sync-company-mirai",
      startedAt: "2025-07-01T00:00:00.000Z",
      completedAt: "2025-07-01T00:00:01.000Z",
      counts: { added: 52, updated: 0, conflict: 0, unchanged: 0 },
    },
  ],
  terrastSyncRecords: [],
  aiGenerationLogs: [
    {
      id: "ai-log-mirai-climate",
      companyId: "company-mirai",
      responseId: "response-company-mirai-demo-cli-01",
      promptVersion: "demo-prompt-v1",
      model: "deterministic-demo",
      inputHash: "demo-input-hash-no-source-data",
      output: { status: "insufficient_evidence", reviewRequired: true },
      executedBy: "user-preparer",
      executedAt: DEMO_DATASET_TIMESTAMP,
      status: "insufficient_evidence",
    },
  ],
  auditLogs: [
    {
      id: "audit-seed-sync",
      organizationId: "org-mirai",
      companyId: "company-mirai",
      actorId: "user-preparer",
      actorRole: "preparer",
      action: "sync",
      entityType: "terrast_sync_job",
      entityId: "sync-job-initial-mirai",
      occurredAt: "2025-07-01T00:00:01.000Z",
      reason: "Synthetic seed import",
      correlationId: "seed-initial-sync-company-mirai",
      syncJobId: "sync-job-initial-mirai",
    },
    {
      id: "audit-seed-review",
      organizationId: "org-mirai",
      companyId: "company-mirai",
      actorId: "user-reviewer",
      actorRole: "reviewer_approver",
      action: "revision_request",
      entityType: "disclosure_response",
      entityId: "response-company-mirai-demo-cli-01",
      occurredAt: "2026-01-20T00:00:00.000Z",
      reason: "Scope 3情報の補足依頼（デモ）",
      correlationId: "review-mirai-climate",
    },
    {
      id: "audit-seed-consent",
      organizationId: "org-mirai",
      companyId: "company-mirai",
      actorId: "user-company-admin",
      actorRole: "company_admin",
      action: "consent_grant",
      entityType: "company_sharing_consent",
      entityId: "consent-mirai-platform",
      occurredAt: "2025-07-01T00:00:00.000Z",
      reason: "デモ表示用の明示同意",
      correlationId: "consent-mirai-platform",
    },
  ],
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const pristineBaseDataset = deepClone(baseDataset);

/** Returns an isolated mutable copy suitable for a repository instance. */
export function createDemoSeed(): DemoDataset {
  return deepClone(pristineBaseDataset);
}

/** Read-only callers should still avoid mutating this object; repositories clone it. */
export const demoSeed: DemoDataset = createDemoSeed();

export function createTerrastMockRecords(
  companyCode?: string,
): TerrastMetricRecord[] {
  const records: TerrastMetricRecord[] = pristineBaseDataset.companies.flatMap(
    (company) => {
      if (companyCode && company.companyCode !== companyCode) return [];
      const latest = pristineBaseDataset.metricValues.filter(
        (value) =>
          value.companyId === company.id &&
          value.reportingPeriod === "FY2025" &&
          value.metricCode === "energy_consumption",
      );
      const baseRecords = latest.map<TerrastMetricRecord>((value) => ({
        externalRecordId: `terrast-mock-sync-${company.companyCode}-FY2025-${value.metricCode}`,
        companyCode: company.companyCode,
        metricCode: value.metricCode,
        reportingPeriod: value.reportingPeriod,
        value: value.normalizedValue,
        unit: value.unit,
        consolidationScope: value.consolidationScope,
        organizationalBoundary: value.organizationalBoundary,
        observedAt: "2026-01-31T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
        confidenceLevel: "high",
        sourceSystem: "TERRAST_MOCK",
        isSynthetic: true,
      }));

      if (company.id !== "company-mirai") return baseRecords;
      return [
        ...baseRecords,
        {
          externalRecordId: "terrast-mock-sync-mirai-scope1",
          companyCode: company.companyCode,
          metricCode: "scope_1_emissions",
          reportingPeriod: "FY2025",
          value: 11_850,
          unit: "tCO2e",
          consolidationScope: "consolidated",
          organizationalBoundary: "operational_control",
          observedAt: "2026-01-31T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          confidenceLevel: "high",
          sourceSystem: "TERRAST_MOCK",
          isSynthetic: true,
        },
        {
          externalRecordId: "terrast-mock-sync-mirai-scope3",
          companyCode: company.companyCode,
          metricCode: "scope_3_emissions",
          reportingPeriod: "FY2025",
          value: 74_000,
          unit: "tCO2e",
          consolidationScope: "consolidated",
          organizationalBoundary: "operational_control",
          observedAt: "2026-01-31T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          confidenceLevel: "medium",
          sourceSystem: "TERRAST_MOCK",
          isSynthetic: true,
        },
        {
          externalRecordId: "terrast-mock-sync-mirai-supplier",
          companyCode: company.companyCode,
          metricCode: "supplier_primary_data_coverage",
          reportingPeriod: "FY2025",
          value: 42,
          unit: "percent",
          consolidationScope: "consolidated",
          organizationalBoundary: "operational_control",
          observedAt: "2026-01-31T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          confidenceLevel: "medium",
          sourceSystem: "TERRAST_MOCK",
          isSynthetic: true,
        },
      ];
    },
  );
  return deepClone(records);
}

export const terrastMockRecords = createTerrastMockRecords();
