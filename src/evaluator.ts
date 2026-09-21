import type { EvaluatedOpportunity, Opportunity } from "./types.js";

export function evaluate(o: Opportunity, policy: any): EvaluatedOpportunity {
  const expectedProfitUsd = o.rewardUsd - o.estimatedCostUsd;
  const profitPerHourUsd =
    o.estimatedTimeSeconds > 0
      ? expectedProfitUsd * 3600 / o.estimatedTimeSeconds
      : 0;

  let eligible = true;
  let rejectionReason: string | undefined;

  if (!policy.dryRun && o.estimatedCostUsd > policy.maxSpendPerTaskUsd) {
    eligible = false;
    rejectionReason = "task cost exceeds per-task limit";
  } else if (o.risk > policy.maxRisk) {
    eligible = false;
    rejectionReason = "risk exceeds policy";
  } else if (expectedProfitUsd < policy.minExpectedProfitUsd) {
    eligible = false;
    rejectionReason = "expected profit below threshold";
  }

  return {
    ...o,
    expectedProfitUsd,
    profitPerHourUsd,
    eligible,
    rejectionReason
  };
}
