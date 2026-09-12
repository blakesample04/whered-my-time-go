// create-checkout-session.js
//
// Starts a $1.99/month Stripe Checkout session for a given email. This is
// the ONLY place a Stripe secret key is used — it never leaves the server.
// If this email already has a Stripe Customer (from a past subscription,
// found via Blobs or by asking Stripe directly), we reuse it instead of
// creating a duplicate customer record.

import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let email;
  try {
    ({ email } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "A valid email is required" }), { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const store = getStore("subscriptions");
    const record = await store.get(normalizedEmail, { type: "json" });

    let customerId = record?.stripeCustomerId;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
      customerId = existing.data[0]?.id;
    }

    // Derived from the request URL Netlify itself routed to this function
    // (validated against the deployed site's domain/SNI), not from the
    // client-supplied `Origin` header — that header is trivially spoofable
    // by any non-browser caller and would otherwise let an attacker steer
    // success_url/cancel_url to an arbitrary domain (open redirect right
    // after a real card payment).
    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: normalizedEmail }),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 500 });
  }
};
