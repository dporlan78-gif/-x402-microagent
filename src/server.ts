import express from "express";
import type { Address } from "viem";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

const PORT = Number(process.env.PORT ?? 4020);
const PAY_TO = (process.env.PAY_TO ?? "") as Address;
const NETWORK = process.env.X402_NETWORK ?? "eip155:84532";

if (!PAY_TO) throw new Error("PAY_TO is required");

const app = express();
app.use(express.json({ limit: "32kb" }));

const facilitator = createCdpFacilitatorClient();
const server = new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme());

app.use(paymentMiddleware({
  "POST /verify": {
    accepts: [{ scheme: "exact", price: "$0.005", network: NETWORK, payTo: PAY_TO }],
    description: "Check whether public source pages contain evidence relevant to a claim"
  }
}, server));

type VerifyRequest = { claim: string; sources: string[] };

function validateBody(body: unknown): VerifyRequest {
  if (!body || typeof body !== "object") throw new Error("body must be an object");
  const b = body as Record<string, unknown>;
  if (typeof b.claim !== "string" || b.claim.trim().length < 3) throw new Error("claim is required");
  if (!Array.isArray(b.sources) || b.sources.length < 1 || b.sources.length > 5) throw new Error("sources must contain 1-5 public HTTPS URLs");
  const sources = b.sources.map(String);
  for (const source of sources) {
    if (new URL(source).protocol !== "https:") throw new Error("only HTTPS sources are allowed");
  }
  return { claim: b.claim.trim(), sources };
}

function claimTerms(claim: string): string[] {
  return claim.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(x => x.length >= 4).slice(0, 20);
}

async function inspectSource(url: string, terms: string[]) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "AgentProof/0.1" } });
  if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
  const text = (await response.text()).slice(0, 1_000_000).toLowerCase();
  const matchedTerms = terms.filter(term => text.includes(term));
  return { url, status: response.status, matchedTerms, coverage: terms.length ? Number((matchedTerms.length / terms.length).toFixed(2)) : 0, retrievedAt: new Date().toISOString() };
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "agentproof", network: NETWORK }));

app.post("/verify", async (req, res) => {
  try {
    const input = validateBody(req.body);
    const terms = claimTerms(input.claim);
    const evidence = [];
    for (const source of input.sources) {
      try { evidence.push(await inspectSource(source, terms)); }
      catch (error) { evidence.push({ url: source, error: error instanceof Error ? error.message : "source_fetch_failed" }); }
    }
    const valid = evidence.filter(x => !("error" in x));
    const confidence = valid.length ? Number((valid.reduce((sum, item) => sum + item.coverage, 0) / valid.length).toFixed(2)) : 0;
    res.json({
      verified: confidence >= 0.7 && valid.length > 0,
      confidence,
      claim: input.claim,
      evidence,
      checkedAt: new Date().toISOString(),
      disclaimer: "AgentProof checks source evidence/availability; it does not establish truth by itself."
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
});

app.listen(PORT, () => console.log(`AgentProof listening on :${PORT} — ${NETWORK} — receiver ${PAY_TO}`));
