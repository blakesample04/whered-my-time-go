import { useNavigate } from "react-router-dom";

// Landing page for Stripe Checkout's cancel redirect — the user backed out
// before paying. No charge was made.
export default function CheckoutCancel() {
  const navigate = useNavigate();
  return (
    <div className="screen no-navbar">
      <div className="screen-title">
        <h1>Premium</h1>
      </div>
      <section className="card">
        <h2>No charge was made</h2>
        <p className="sub">You canceled checkout — nothing was billed. You can subscribe any time from Settings.</p>
        <button className="primary" onClick={() => navigate("/settings")}>
          Back to Settings
        </button>
      </section>
    </div>
  );
}
