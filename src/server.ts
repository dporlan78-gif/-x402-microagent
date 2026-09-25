import "dotenv/config";
import express from "express";
import axios from "axios";
import { createX402Server } from "@coinbase/cdp-sdk/x402";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";

const PORT = Number(process.env.PORT ?? 4020);
const MAX_SOURCE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 8_000;

type VerifyRequest = {
  claim: string;
  sources: string[];
};

function validateBody(body: unknown): VerifyRequest {
  if (!body || typeof body !== "object") throw new Error("body must be an object");
  const b = body as Record<string, unknown>;
  if (typeof b.claim !== "string" || b.claim.trim().length < 3) {
    throw new Error("claim is required");
  }
  if (!Array.isArray(b.sources) || b.sources.length < 1 || b.sources.length > 5) {
    throw new Error("sources must contain 1-5 public URLs");
  }
  const sources = b.sources.map(String);
  for (const url of sources) {
    const u = new URL(url);
    if (u.protocol !== "https:") throw new Error("only https sources are allowed");
  }
  return { claim: b.claim.trim(), sources };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\\s+/g, " ").trim();
}

function claimTerms(claim: string): string[] {
  return normalize(claim)
    .replace(/[^\\p{L}\\p{N} ]/gu, " ")
    .split(" ")
    .filter((x) => x.length >= 4)
    .slice(0, 20);
}

async function inspectSource(url: string, terms: string[]) {
  const response = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT_MS,
    maxContentLength: MAX_SOURCE_BYTES,
    maxBodyLength: MAX_SOURCE_BYTES,
    responseType: "text",
    headers: { "User-Agent": "AgentProof/0.1 (+https://github.com/dporlan78-gif/-x402-microagent)" }
  });

  const text = normalize(String(response.data));
  const matched = terms.filter((term) => text.includes(term));
  return {
    url,
    status: response.status,
    contentType: String(response.headers["content-type"] ?? ""),
    matchedTerms: matched,
    coverage: terms.length ? Number((matched.length / terms.length).toFixed(2)) : 0,
    retrievedAt: new Date().toISOString()
  };
}

async function main() {
  const payTo = process.env.PAY_TO;
  if (!payTo) throw new Error("PAY_TO is required");

  const x402 = await createX402Server({
    routes: {
      "POST /verify": {
        price: "$0.005",
        description: "Independently check whether public sources contain evidence relevant to a claim"
      }
    }
  });

  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.use(paymentMiddlewareFromHTTPServer(x402));

  app.get("/health", (_req, res) => res.json({
    ok: true,
    service: "agentproof",
    version: "0.1.0"
  }));

  app.post("/verify", async (req, res) => {
    try {
      const input = validateBody(req.body);
      const terms = claimTerms(input.claim);
      const evidence = [];

      for (const source of input.sources) {
        try {
          evidence.push(await inspectSource(source, terms));
        } catch (error) {
          evidence.push({
            url: source,
            error: error instanceof Error ? error.message : "source_fetch_failed"
          });
        }
      }

      const valid = evidence.filter((x) => !("error" in x));
      const avgCoverage = valid.length
        ? Number((valid.reduce((sum, x) => sum + x.coverage, 0) / valid.length).toFixed(2))
        : 0;

      res.json({
        verified: avgCoverage >= 0.7 && valid.length > 0,
        confidence: avgCoverage,
        claim: input.claim,
        evidence,
        checkedAt: new Date().toISOString(),
        disclaimer: "This verifies source evidence/availability, not the truth of the claim itself."
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "invalid_request"
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`AgentProof listening on :${PORT}`);
    console.log("Paid endpoint: POST /verify — $0.005");
    console.log(`Receiver: ${payTo}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
