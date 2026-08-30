// stripe-webhook.js
//
// Keeps Netlify Blobs in sync with Stripe as the source of truth, so
// check-subscription.js's email lookup stays correct even without the user
// revisiting /checkout/success (renewals, cancellations, failed payments).
//
// Signature verification against the RAW request body is mandatory here —
// this is the one endpoint on the internet that claims "this email paid,"
// so an unverified POST must never be trusted.

import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const HANDLED_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    // Not an event we asked for or care about — acknowledge so Stripe
    // doesn't retry, but do nothing.
    return new Response("ignored", { status: 200 });
  }

  try {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    if (customer.deleted) {
      return new Response("customer deleted, nothing to update", { status: 200 });
    }
    const email = customer.email?.trim().toLowerCase();
    if (!email) {
      return new Response("customer has no email, nothing to update", { status: 200 });
    }

    const store = getStore("subscriptions");
    const existing = await store.get(email, { type: "json" });

    // Ignore out-of-order webhook delivery (rare, but Stripe doesn't
    // guarantee order): don't let an older event overwrite a newer one.
    if (existing?.lastEventCreated && event.created < existing.lastEventCreated) {
      return new Response("stale event, ignored", { status: 200 });
    }

    await store.setJSON(email, {
      email,
      status: subscription.status,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end,
      lastEventCreated: event.created,
      updatedAt: new Date().toISOString(),
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    // 500 so Stripe retries delivery.
    return new Response("internal error", { status: 500 });
  }
};
