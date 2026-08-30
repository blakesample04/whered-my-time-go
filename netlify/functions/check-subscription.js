// check-subscription.js
//
// Two ways to call this:
//   POST { email }     — "is this email currently subscribed?" (the
//                         cross-device unlock flow in Settings)
//   POST { sessionId }  — "did this just-completed Checkout session pay?"
//                         (the /checkout/success redirect). This asks Stripe
//                         directly instead of only trusting our Blobs
//                         record, so a fresh subscriber never has to wait on
//                         webhook delivery to see Premium unlock.
//
// Both resolve { active, email, currentPeriodEnd } — active:false (not an
// error) whenever nothing is found, so the client can tell "not subscribed"
// apart from "couldn't verify" (a thrown/non-200 response).

import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Subscription statuses that should still unlock Premium. past_due is
// included deliberately: Stripe auto-retries a failed card for ~2-3 weeks,
// and at $1.99/month the cost of a few days' grace is low. Remove it here
// if you'd rather lock the moment a payment fails.
const UNLOCKED_STATUSES = new Set(["active", "trialing", "past_due"]);

function toResult(record) {
  if (!record) return { active: false, email: null, currentPeriodEnd: null };
  return {
    active: UNLOCKED_STATUSES.has(record.status),
    email: record.email,
    currentPeriodEnd: record.currentPeriodEnd ?? null,
  };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const store = getStore("subscriptions");

  try {
    if (body.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(body.sessionId, {
        expand: ["subscription", "customer"],
      });
      const email = session.customer_details?.email?.trim().toLowerCase();
      const subscription = session.subscription;
      if (!email || !subscription) {
        return new Response(JSON.stringify({ active: false, email: null, currentPeriodEnd: null }), { status: 200 });
      }

      const record = {
        email,
        status: subscription.status,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
        lastEventCreated: Math.floor(Date.now() / 1000),
        updatedAt: new Date().toISOString(),
      };
      // Self-heal Blobs from Stripe's own answer, in case the webhook is
      // slower to arrive than this request.
      await store.setJSON(email, record);

      return new Response(JSON.stringify(toResult(record)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.email && typeof body.email === "string") {
      const normalizedEmail = body.email.trim().toLowerCase();
      const record = await store.get(normalizedEmail, { type: "json" });
      return new Response(JSON.stringify(toResult(record)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "email or sessionId is required" }), { status: 400 });
  } catch (err) {
    console.error("check-subscription error:", err);
    return new Response(JSON.stringify({ error: "Could not check subscription" }), { status: 500 });
  }
};
