# x402 Microagent

Autonomous micro-opportunity scanner. The first milestone is intentionally **DRY_RUN**: no wallet, no private keys, no real-money spending.

## What it does

- scans public GitHub issues for potential micro-bounties/signals
- normalizes opportunities
- estimates expected value
- applies a strict zero-spend policy
- writes a JSON report
- runs on GitHub Actions

## Safety

The initial policy has:
- dryRun: true
- maxSpendPerTask: 0
- maxDailySpend: 0

Do not put private keys, seed phrases, or wallet secrets in the repository.

## Run locally (optional)

```bash
npm install
npm run agent
```
