// premium.js
//
// Free/Premium feature gating. IMPORTANT: state.isPremium is currently a
// local test toggle only (see Settings) — there is no real payment
// processor wired up. Nothing here should be mistaken for actual billing;
// this exists purely so the gated experience can be built and verified
// ahead of adding real Stripe/subscription infrastructure later.

export const PREMIUM_FEATURES = [
  { id: "multi_goal", label: "Unlimited goals" },
  { id: "time_budget", label: "Time budgeting" },
  { id: "instead", label: "\"What could I have done instead?\"" },
  { id: "patterns", label: "Personal behavior patterns" },
  { id: "recovery", label: "Goal recovery plans" },
  { id: "advanced_report", label: "Advanced weekly reports" },
  { id: "trends", label: "Historical trends" },
];

export function isFeatureUnlocked(featureId, isPremium) {
  if (isPremium) return true;
  return !PREMIUM_FEATURES.some((f) => f.id === featureId);
}

export const FREE_GOAL_LIMIT = 1;
