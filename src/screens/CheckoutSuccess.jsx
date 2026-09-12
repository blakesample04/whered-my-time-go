import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { checkSubscription } from "../lib/billing";

// Landing page for Stripe Checkout's success redirect. Confirms the
// just-completed session directly with Stripe (via the sessionId, not just
// Blobs) so Premium unlocks immediately even if the webhook hasn't landed
// yet — see lib/billing.js and netlify/functions/check-subscription.js.
export default function CheckoutSuccess() {
  const { actions } = useAppState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | active | not_found | error

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("not_found");
      return;
    }
    let cancelled = false;
    checkSubscription({ sessionId })
      .then(({ active, email }) => {
        if (cancelled) return;
        if (active && email) {
          actions.setPremiumStatus(email, true);
          setStatus("active");
        } else {
          setStatus("not_found");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen no-navbar">
      <div className="screen-title">
        <h1>Premium</h1>
      </div>
      <section className="card">
        {status === "checking" && <p className="sub">Confirming your subscription…</p>}

        {status === "active" && (
          <>
            <h2>You're in — thank you!</h2>
            <p className="sub">Premium is unlocked on this device.</p>
            <button className="primary" onClick={() => navigate("/settings")}>
              Continue to Settings
            </button>
          </>
        )}

        {status === "not_found" && (
          <>
            <h2>Almost there</h2>
            <p className="sub">
              We couldn't confirm the subscription yet — this can happen for a few seconds right after paying.
              Head to Settings and use "Already subscribed? Enter your email" to unlock it.
            </p>
            <button className="primary" onClick={() => navigate("/settings")}>
              Go to Settings
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h2>Couldn't reach the server</h2>
            <p className="sub">
              Your payment may still have gone through — check your email for a Stripe receipt, then go to
              Settings and enter your email to unlock Premium.
            </p>
            <button className="primary" onClick={() => navigate("/settings")}>
              Go to Settings
            </button>
          </>
        )}
      </section>
    </div>
  );
}
