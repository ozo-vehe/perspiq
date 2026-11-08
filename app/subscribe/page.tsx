"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SubscribePage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("token");
    if (params.get("paypal") === "cancelled") setMessage("Checkout was cancelled. Your account has not been charged.");
    if (!orderId) return;
    fetch("/api/paypal/capture-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage("Payment complete. Your Perspiq Plus access is ready."); window.history.replaceState({}, "", "/subscribe?paypal=success"); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Payment could not be completed."));
  }, []);
  async function startCheckout() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/paypal/create-order", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.approvalUrl) throw new Error(data.error || "PayPal is unavailable.");
      window.location.assign(data.approvalUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "PayPal checkout is unavailable."); setBusy(false); }
  }
  return <main id="main-content" className="mx-auto max-w-5xl px-5 py-16 lg:py-24"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Keep your clarity</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Unlimited explanations, when you need them.</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">Perspiq Plus keeps the AI health-literacy workspace available after the five free translations.</p></div><div className="mx-auto mt-12 max-w-md rounded-3xl border border-primary/30 bg-card p-7 shadow-lg"><p className="text-sm font-semibold text-primary">Perspiq Plus</p><p className="mt-3 text-4xl font-semibold">$5<span className="text-base font-normal text-muted-foreground"> / month</span></p><ul className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground"><li>Unlimited AI-assisted medical language translations</li><li>Private translation history</li><li>Clear questions to take to your care team</li><li>Secure PayPal sandbox checkout</li></ul><button disabled={busy} className="mt-8 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60" onClick={startCheckout}>{busy ? "Opening PayPal…" : "Continue with PayPal"}</button>{message && <p role="status" className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}<Link href="/translate" className="mt-4 block text-center text-sm font-semibold text-primary">Back to translator</Link></div></main>;
}
