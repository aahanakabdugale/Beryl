// BERYL smoke test: checks Supabase, PayPal sandbox, Channel3 and Groq.
// Needs Node 20.6+ (built-in fetch and --env-file). No npm install required.
//
// Run:  node --env-file=.env smoke-test.mjs
//
// .env needs:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_KEY=...                 (anon or service role key)
//   SUPABASE_TEST_TABLE=...          (optional: one of your 9 table names)
//   PAYPAL_CLIENT_ID=...
//   PAYPAL_CLIENT_SECRET=...
//   CHANNEL3_API_KEY=...
//   GROQ_API_KEY=...
//   GROQ_MODEL=openai/gpt-oss-20b  (optional)

const env = process.env;
const TIMEOUT_MS = 15000;

const need = (...names) => {
  const missing = names.filter((n) => !env[n]);
  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);
};

const call = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { res, body };
};

const short = (v) => (typeof v === "string" ? v : JSON.stringify(v)).slice(0, 200);

const tests = {
  async Supabase() {
    const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      env.SUPABASE_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Could not find Supabase URL/key in the env file. Looked for SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and " +
          "SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    const base = url.replace(/\/$/, "");
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    if (env.SUPABASE_TEST_TABLE) {
      const t = env.SUPABASE_TEST_TABLE;
      const { res, body } = await call(`${base}/rest/v1/${t}?select=*&limit=1`, { headers });
      if (!res.ok) throw new Error(`Read from "${t}" failed (${res.status}): ${short(body)}`);
      return `read from table "${t}" OK (${Array.isArray(body) ? body.length : 0} row(s) returned)`;
    }

    const { res, body } = await call(`${base}/auth/v1/health`, { headers });
    if (!res.ok) throw new Error(`Auth health failed (${res.status}): ${short(body)}`);
    return "project reachable and key accepted (set SUPABASE_TEST_TABLE to also test a table read)";
  },

  async PayPal() {
    need("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET");
    const basic = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const { res, body } = await call("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`Token request failed (${res.status}): ${short(body)}`);
    return `sandbox access token received (expires in ${body.expires_in}s)`;
  },

  async Channel3() {
    need("CHANNEL3_API_KEY");
    const { res, body } = await call("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: { "x-api-key": env.CHANNEL3_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "wireless headphones", limit: 1 }),
    });
    if (!res.ok) throw new Error(`Search failed (${res.status}): ${short(body)}`);
    const n = body.products?.length ?? 0;
    if (!n) throw new Error("Search worked but returned 0 products");
    return `search OK, top result: "${body.products[0].title}"`;
  },

  async Groq() {
    need("GROQ_API_KEY");
    const model = env.GROQ_MODEL || "openai/gpt-oss-20b";
    const { res, body } = await call("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with the single word: pong" }],
        max_tokens: 300,
      }),
    });
    if (!res.ok) throw new Error(`Chat completion failed (${res.status}) with model "${model}": ${short(body)}`);
    return `model "${model}" replied: "${body.choices?.[0]?.message?.content?.trim()}"`;
  },
};

let failed = 0;
console.log("\nBERYL smoke test\n" + "-".repeat(40));
for (const [name, fn] of Object.entries(tests)) {
  const start = Date.now();
  try {
    const msg = await fn();
    console.log(`PASS  ${name.padEnd(9)} ${msg}  [${Date.now() - start}ms]`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name.padEnd(9)} ${err.message}`);
  }
}
console.log("-".repeat(40));
console.log(failed ? `${failed} of ${Object.keys(tests).length} failed` : "All services OK");
process.exit(failed ? 1 : 0);
