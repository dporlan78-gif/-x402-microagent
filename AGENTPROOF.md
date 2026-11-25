# AgentProof MVP

An x402-paid microservice built on top of the original x402 Microagent repository.

## What changed

The original project was a dry-run GitHub bounty scanner. This branch keeps that scanner intact and adds a second experiment: **AgentProof**, a machine-payable verification endpoint.

An agent pays $0.005 and sends:

- a claim
- 1-5 public HTTPS sources

The service fetches those sources, checks how much of the claim's significant terms are supported by the returned content, and returns structured evidence.

**Important:** this is evidence/availability checking, not a claim of factual truth.

## Run

Set these environment variables:

```
PAY_TO=0xYourReceiverAddress
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...
PORT=4020
```

Then:

```
npm install
npm run server
```

`GET /health` is free. `POST /verify` is x402-gated at $0.005.

The current x402 TypeScript stack supports Express resource servers and CDP-hosted facilitation; the official examples also demonstrate paid HTTP and MCP routes. See https://github.com/x402-foundation/x402 and the Coinbase CDP x402 examples.

## First validation goal

Do **not** build a dashboard, mobile app, SEO site, or subscription.

The only KPI for this MVP is:

> Can an external agent discover this endpoint and pay $0.005 for a useful verification result?

If not, stop. If yes, expand only the verification primitive that gets repeated use.
