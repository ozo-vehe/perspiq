import { NextResponse } from "next/server";

function paypalBaseUrl() {
  return process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function POST(request: Request) {
  try {
    const { orderId } = (await request.json()) as { orderId?: string };
    if (!orderId || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json({ error: "Missing PayPal checkout details." }, { status: 400 });
    }
    const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
    const { access_token } = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !access_token) throw new Error("PayPal authentication failed");
    const captureResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, cache: "no-store" });
    const data = await captureResponse.json();
    if (!captureResponse.ok) return NextResponse.json({ error: "PayPal could not complete payment." }, { status: 502 });
    return NextResponse.json({ status: data.status, orderId: data.id });
  } catch (error) {
    console.error("[paypal/capture-order] Failed", error);
    return NextResponse.json({ error: "Payment could not be completed." }, { status: 502 });
  }
}
