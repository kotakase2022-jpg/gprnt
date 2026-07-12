import { describe, expect, it } from "vitest";
import { demoMarketplaceOfferings } from "@/data";
import { matchMarketplaceOfferings } from "./marketplace";

describe("marketplace matching", () => {
  it("deterministically ranks synthetic services by industry, hotspot, gap, and action", () => {
    const matches = matchMarketplaceOfferings(
      {
        industry: "manufacturing",
        hotspots: ["scope_3", "transition"],
        gapCodes: ["SUPPLIER_DATA", "SCOPE3_COVERAGE", "TRANSITION_CAPEX"],
        transitionActionKeywords: ["サプライヤー対話", "設備投資"],
      },
      demoMarketplaceOfferings,
    );
    expect(matches[0]?.offering.id).toBe("offering-demo-scope3");
    expect(matches[0]?.reasons).toContain("Supports gap SUPPLIER_DATA");
    expect(matches.every((match) => match.offering.isSynthetic)).toBe(true);
    expect(
      matchMarketplaceOfferings(
        {
          industry: "other",
          hotspots: [],
          gapCodes: [],
          transitionActionKeywords: [],
        },
        [],
      ),
    ).toEqual([]);
  });
});
