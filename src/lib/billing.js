// billing.js
//
// Thin client for the two Netlify Functions that talk to Stripe on our
// behalf (see netlify/functions/). The browser never touches Stripe
// directly — no key of any kind ships in this bundle — it only ever calls
// our own endpoints and, for starting a purchase, gets redirected to
// Stripe's hosted Checkout page.
//
// Important: a network/server error THROWS. It must never be treated the
// same as a clean "not subscribed" response, or a real subscriber who's
// briefly offline would get silently downgraded. Only a successful HTTP
// response with { active: false } means "not subscribed."

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} failed (${res.status}): ${text || "no details"}`);
  }
  return res.json();
}

// Starts a $1.99/month Checkout session for the given email and returns the
// Stripe-hosted URL to redirect the browser to.
export async function startCheckout(email) {
  const { url } = await postJSON("/.netlify/functions/create-checkout-session", { email });
  return url;
}

// Looks up whether an email currently has an active subscription, OR (right
// after a successful Checkout redirect) confirms a specific session id
// directly with Stripe so the caller doesn't have to wait on webhook
// delivery. Pass exactly one of { email } or { sessionId }.
// Resolves to { active, email, currentPeriodEnd }.
export async function checkSubscription({ email, sessionId } = {}) {
  return postJSON("/.netlify/functions/check-subscription", email ? { email } : { sessionId });
}
