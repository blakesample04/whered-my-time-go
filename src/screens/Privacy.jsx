import { useNavigate } from "react-router-dom";

// Required by Stripe (linked from Checkout) and by app-store listings
// (Google Play's data-safety section links here). Kept short and honest:
// this app collects almost nothing, because almost everything it does
// happens entirely in the browser's local storage.
export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Privacy &amp; Terms</h1>
        <p>Last updated August 2026.</p>
      </div>

      <section className="card">
        <h2>Who runs this app</h2>
        <p className="sub">
          "Where'd my time go?" is made and run by an individual developer, not a company. Contact:{" "}
          <a className="link" href="mailto:blake.sample04@gmail.com">blake.sample04@gmail.com</a>.
        </p>
      </section>

      <section className="card">
        <h2>What data this app collects</h2>
        <p className="sub">
          Almost none. Your goals, usage entries, focus sessions, streaks, and settings are stored only in
          your browser's local storage on your own device — they are never sent to a server, and the
          developer never sees them. Uninstalling the app or clearing your browser's site data deletes
          them permanently; there is no cloud backup.
        </p>
        <p className="sub">
          The one exception is billing: if you subscribe to Premium, the email address you enter is sent
          to Stripe (our payment processor) to process payment and to our server to confirm your
          subscription is active. We store that email and your subscription status only for that purpose —
          nothing else about how you use the app is ever transmitted.
        </p>
      </section>

      <section className="card">
        <h2>No ads, no tracking, no third-party analytics</h2>
        <p className="sub">
          This app doesn't show ads, doesn't use analytics or advertising SDKs, and doesn't sell or share
          any data, because it doesn't collect any beyond the billing email described above.
        </p>
      </section>

      <section className="card">
        <h2>Payments &amp; subscriptions</h2>
        <p className="sub">
          Premium is $1.99/month, billed by Stripe. You can stop a subscription at any time from the
          receipt email Stripe sends you, or by contacting the developer at the email above — the
          subscription simply won't renew for the next billing period; there are no refunds for time
          already used within a billing period, but reach out if something went wrong and we'll sort it
          out.
        </p>
      </section>

      <section className="card">
        <h2>Changes</h2>
        <p className="sub">
          If this policy changes in any meaningful way, the "last updated" date above will change too.
        </p>
        <button className="secondary" type="button" onClick={() => navigate("/settings")}>
          Back to Settings
        </button>
      </section>
    </div>
  );
}
