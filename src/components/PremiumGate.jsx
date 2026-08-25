import { Link } from "react-router-dom";

/**
 * Wraps a premium-only section. When locked, shows a soft preview treatment
 * (dimmed content behind a blur, not hidden entirely — you can see there's
 * something here worth having) plus a low-pressure link to Settings, where
 * the (currently test-only) Premium toggle lives. Never a hard paywall
 * interruption — the free experience keeps working around it.
 */
export default function PremiumGate({ unlocked, label, children }) {
  if (unlocked) return children;
  return (
    <div className="premium-gate">
      <div className="premium-gate-preview" aria-hidden="true">{children}</div>
      <div className="premium-gate-overlay">
        <span className="premium-gate-badge">✦ Premium</span>
        <p>{label || "This is part of Premium."}</p>
        <Link to="/settings" className="link">See Premium</Link>
      </div>
    </div>
  );
}
