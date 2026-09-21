import fs from "node:fs/promises";
import path from "node:path";
import { scanGitHub } from "./scanner.js";
import { evaluate } from "./evaluator.js";

const root = process.cwd();
const policy = JSON.parse(
  await fs.readFile(path.join(root, "config/policy.json"), "utf8")
);

console.log("MICROAGENT x402");
console.log("DRY_RUN:", policy.dryRun);
console.log("Scanning GitHub...");

const opportunities = await scanGitHub(policy.githubSearchQueries);
const evaluated = opportunities.map(o => evaluate(o, policy));

const eligible = evaluated
  .filter(o => o.eligible)
  .sort((a, b) => b.profitPerHourUsd - a.profitPerHourUsd);

const report = {
  generatedAt: new Date().toISOString(),
  policy,
  discovered: opportunities.length,
  eligible: eligible.length,
  realMoneySpentUsd: 0,
  opportunities: evaluated
};

await fs.mkdir(path.join(root, "data"), { recursive: true });
await fs.writeFile(
  path.join(root, "data", "latest-report.json"),
  JSON.stringify(report, null, 2)
);

console.log("Discovered:", opportunities.length);
console.log("Eligible:", eligible.length);
console.log("Real money spent: $0.00");

for (const o of eligible.slice(0, 10)) {
  console.log(
    `- ${o.title} | expected $ ${o.expectedProfitUsd.toFixed(4)} | ${o.url}`
  );
}
