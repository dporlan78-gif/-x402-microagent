import axios from "axios";
import type { Opportunity } from "./types.js";

type GitHubIssue = {
  id: number;
  title: string;
  html_url: string;
  body?: string | null;
};

export async function scanGitHub(queries: string[]): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  for (const q of queries) {
    const response = await axios.get("https://api.github.com/search/issues", {
      params: {
        q: `${q} is:issue is:open`,
        per_page: 10
      },
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "x402-microagent"
      },
      timeout: 15000
    });

    for (const issue of (response.data.items ?? []) as GitHubIssue[]) {
      opportunities.push({
        id: `github-${issue.id}`,
        source: "github",
        title: issue.title,
        url: issue.html_url,
        description: issue.body ?? "",
        rewardUsd: inferReward(issue.title + " " + (issue.body ?? "")),
        estimatedCostUsd: 0,
        estimatedTimeSeconds: 300,
        risk: 0.15
      });
    }
  }

  const unique = new Map(opportunities.map(o => [o.id, o]));
  return [...unique.values()];
}

function inferReward(text: string): number {
  const match = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : 0;
}
