import { NextResponse } from "next/server";

const PLAN_AMOUNT = "5.00";
const CURRENCY = "USD";

function paypalBaseUrl() {
  return process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal is not configured");
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to authenticate with PayPal");
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal did not return an access token");
  return data.access_token;
}

export async function POST() {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          description: "Perspiq Plus — AI health-literacy translations",
          amount: { currency_code: CURRENCY, value: PLAN_AMOUNT },
        }],
        application_context: {
          brand_name: "Perspiq",
          user_action: "PAY_NOW",
          return_url: `${process.env.PAYPAL_RETURN_URL ?? "http://localhost:3000/subscribe"}?paypal=success`,
          cancel_url: `${process.env.PAYPAL_CANCEL_URL ?? "http://localhost:3000/subscribe"}?paypal=cancelled`,
        },
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("[paypal/create-order] PayPal error", response.status);
      return NextResponse.json({ error: "PayPal could not create checkout." }, { status: 502 });
    }
    const approvalUrl = data.links?.find((link: { rel?: string }) => link.rel === "approve")?.href;
    return NextResponse.json({ orderId: data.id, approvalUrl });
  } catch (error) {
    console.error("[paypal/create-order] Failed", error);
    return NextResponse.json({ error: "PayPal checkout is not configured yet." }, { status: 503 });
  }
}
