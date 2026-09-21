export type Opportunity = {
  id: string;
  source: string;
  title: string;
  url: string;
  description: string;
  rewardUsd: number;
  estimatedCostUsd: number;
  estimatedTimeSeconds: number;
  risk: number;
};

export type EvaluatedOpportunity = Opportunity & {
  expectedProfitUsd: number;
  profitPerHourUsd: number;
  eligible: boolean;
  rejectionReason?: string;
};
