import {
  ExecutePaymentParams,
  PayPalOrderResponse,
  PayPalTokenResponse,
} from "./types";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENV || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Obtains an OAuth2 client credentials token from PayPal sandbox.
 * Reuses cached token until 60 seconds before expiration.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET environment variable."
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to obtain PayPal OAuth token (${response.status}): ${errorText}`
    );
  }

  const data: PayPalTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}

/**
 * Creates a PayPal sandbox order with idempotency header (PayPal-Request-Id).
 */
export async function createSandboxOrder(
  params: ExecutePaymentParams
): Promise<PayPalOrderResponse> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const amountStr = (params.amountCents / 100).toFixed(2);
  const currency = params.currency || "USD";

  const orderPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.requestId,
        custom_id: params.requestId,
        invoice_id: `BERYL-${params.requestId.replace(/-/g, "").slice(0, 12)}`,
        description: `BERYL Guarded Purchase: ${params.itemName}`.slice(0, 127),
        amount: {
          currency_code: currency,
          value: amountStr,
        },
      },
    ],
    application_context: {
      brand_name: "BERYL Guarded Commerce",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // CRITICAL: PayPal-Request-Id provides server-side idempotency
      "PayPal-Request-Id": params.requestId,
    },
    body: JSON.stringify(orderPayload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PayPal Create Order API failed (${response.status}): ${errorText}`
    );
  }

  const data: PayPalOrderResponse = await response.json();
  return data;
}
