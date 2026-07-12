import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const original = {
  demo: process.env.NEXT_PUBLIC_DEMO_MODE,
  key: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
};

function request(role = "preparer") {
  return new NextRequest("http://localhost/api/ai/disclosure", {
    method: "POST",
    headers: { "content-type": "application/json", "x-demo-role": role },
    body: JSON.stringify({
      companyId: "company-demo",
      requirementId: "requirement-demo",
      requirementSummary: "排出量を説明する。",
      sourceData: [
        {
          id: "current-1",
          label: "Scope 1",
          value: 100,
          unit: "t-CO2e",
          period: "FY2025",
          confidence: 90,
          organizationalBoundary: "連結",
        },
        {
          id: "current-2",
          label: "Scope 1",
          value: 101,
          unit: "t-CO2e",
          period: "FY2025",
          confidence: 60,
          organizationalBoundary: "連結",
        },
      ],
      priorYearData: [
        {
          id: "prior-1",
          label: "Scope 1",
          value: 120,
          unit: "t-CO2e",
          period: "FY2024",
          confidence: 90,
        },
      ],
      evidenceIds: ["evidence-1"],
      requestedTasks: ["不整合を検出", "前年差を要約", "根拠の弱い文章を警告"],
    }),
  });
}

afterEach(() => {
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_DEMO_MODE: original.demo,
    OPENAI_API_KEY: original.key,
    OPENAI_MODEL: original.model,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("AI disclosure route demo boundary", () => {
  it("stays deterministic and returns grounded checks even when API credentials exist", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.OPENAI_API_KEY = "must-not-be-used";
    process.env.OPENAI_MODEL = "must-not-be-used";
    const response = await POST(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.meta).toMatchObject({
      mode: "demo",
      model: "deterministic-demo",
    });
    expect(payload.output.inconsistencies).toEqual([
      expect.objectContaining({ type: "number" }),
    ]);
    expect(payload.output.priorYearChanges).toHaveLength(2);
    expect(payload.output.weakEvidenceWarnings).toHaveLength(1);
  });

  it("rejects a demo role without AI permission", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const response = await POST(request("supplier_user"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "unauthorized",
        correlationId: expect.any(String),
      }),
    );
  });

  it("does not echo untrusted endorsement text in public demo output", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const unsafe = request();
    const body = await unsafe.text();
    const parsed = JSON.parse(body) as Record<string, unknown>;
    parsed.requirementSummary = "JPX公認・法的に完全適合しています。";
    const response = await POST(
      new NextRequest("http://localhost/api/ai/disclosure", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-role": "preparer",
        },
        body: JSON.stringify(parsed),
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(payload)).not.toMatch(/JPX公認|完全適合/);
  });
});
