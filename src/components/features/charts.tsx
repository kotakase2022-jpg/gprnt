"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
  fontSize: "12px",
};

export function EmissionsTrendChart() {
  const data = [
    { year: "FY2023", scope1: 13920, scope2: 10180, scope3: 82500 },
    { year: "FY2024", scope1: 13140, scope2: 9460, scope3: 78600 },
    { year: "FY2025", scope1: 12420, scope2: 8710, scope3: 74100 },
  ];
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="FY2023からFY2025までのScope 1、2、3排出量推移"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="scope1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${Number(value).toLocaleString()} t-CO₂e`]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="scope3"
            name="Scope 3"
            stroke="var(--chart-2)"
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="scope2"
            name="Scope 2"
            stroke="var(--chart-4)"
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="scope1"
            name="Scope 1"
            stroke="var(--chart-1)"
            fill="url(#scope1)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Scope3CoverageChart() {
  const data = [
    { category: "Cat.1", coverage: 68 },
    { category: "Cat.2", coverage: 82 },
    { category: "Cat.3", coverage: 94 },
    { category: "Cat.4", coverage: 46 },
    { category: "Cat.5", coverage: 100 },
    { category: "Cat.6", coverage: 75 },
    { category: "Cat.7", coverage: 88 },
    { category: "Cat.9", coverage: 38 },
  ];
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Scope 3主要カテゴリー別データ充足率"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value}%`, "充足率"]}
          />
          <Bar dataKey="coverage" fill="var(--chart-1)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OperatorReadinessChart() {
  const data = [
    { industry: "製造", general: 78, climate: 66 },
    { industry: "小売", general: 69, climate: 54 },
    { industry: "情報通信", general: 84, climate: 72 },
    { industry: "金融", general: 88, climate: 81 },
    { industry: "運輸", general: 64, climate: 58 },
  ];
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="業種別SSBJ一般・気候関連開示準備度"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="industry"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value}%`]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="general"
            name="SSBJ一般"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="climate"
            name="SSBJ気候"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QualityDistributionChart() {
  const data = [
    { name: "高", companies: 38 },
    { name: "中", companies: 71 },
    { name: "要改善", companies: 19 },
  ];
  return (
    <div
      className="h-52 w-full"
      role="img"
      aria-label="参加企業のデータ品質分布"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -20, right: 12, top: 12 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="companies"
            name="企業数"
            stroke="var(--chart-1)"
            strokeWidth={3}
            dot={{ r: 5, fill: "var(--chart-1)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
