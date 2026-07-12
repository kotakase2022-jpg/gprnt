import type { Industry, MarketplaceOffering } from "./types";

export interface MarketplaceCompanyProfile {
  industry: Industry;
  hotspots: Array<
    | "scope_1"
    | "scope_2"
    | "scope_3"
    | "human_capital"
    | "disclosure"
    | "transition"
  >;
  gapCodes: string[];
  transitionActionKeywords: string[];
}

export interface MarketplaceMatch {
  offering: MarketplaceOffering;
  score: number;
  reasons: string[];
}

const intersection = <T>(left: readonly T[], right: readonly T[]): T[] => {
  const rightSet = new Set(right);
  return [...new Set(left.filter((item) => rightSet.has(item)))];
};

export function matchMarketplaceOfferings(
  profile: MarketplaceCompanyProfile,
  offerings: readonly MarketplaceOffering[],
): MarketplaceMatch[] {
  return offerings
    .map<MarketplaceMatch>((offering) => {
      const reasons: string[] = [];
      let score = 0;

      if (offering.supportedIndustries.includes(profile.industry)) {
        score += 20;
        reasons.push("Industry fit");
      }

      const hotspots = intersection(
        profile.hotspots,
        offering.supportedHotspots,
      );
      score += Math.min(30, hotspots.length * 15);
      for (const hotspot of hotspots)
        reasons.push(`Addresses ${hotspot.replaceAll("_", " ")}`);

      const gaps = intersection(profile.gapCodes, offering.supportedGapCodes);
      score += Math.min(35, gaps.length * 15);
      for (const gap of gaps) reasons.push(`Supports gap ${gap}`);

      const normalizedActions = profile.transitionActionKeywords.map(
        (keyword) => keyword.toLocaleLowerCase("ja"),
      );
      const keywords = offering.relatedActionKeywords.filter((keyword) =>
        normalizedActions.some((action) =>
          action.includes(keyword.toLocaleLowerCase("ja")),
        ),
      );
      score += Math.min(15, keywords.length * 5);
      for (const keyword of keywords)
        reasons.push(`Related to transition action: ${keyword}`);

      return { offering, score: Math.min(100, score), reasons };
    })
    .filter((match) => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.offering.id.localeCompare(right.offering.id),
    );
}
