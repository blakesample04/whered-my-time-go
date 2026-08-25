// defaultState.js
//
// The full shape of persisted app state, and its defaults for a brand new
// user. Every screen's "first-time / empty" behavior traces back to these
// defaults being sensible on their own (empty arrays, null target, etc.)
// rather than each screen needing its own special-cased empty-state logic.

export const STORAGE_KEYS = {
  onboardingComplete: "onboardingComplete",
  onboardingEstimateMinutesPerDay: "onboardingEstimate",
  timeBackGoals: "timeBackGoals",
  usageLog: "usageLog",
  targetHistory: "targetHistory",
  appGoals: "appGoals",
  goals: "goals",
  focusSessions: "focusSessions",
  activeFocusSession: "activeFocusSession",
  challengeCompletions: "challengeCompletions",
  reflections: "reflections",
  achievementsUnlocked: "achievementsUnlocked",
  notificationsEnabled: "notificationsEnabled",
  timeBudget: "timeBudget",
  appCategories: "appCategories",
  isPremium: "isPremium",
  recoveryPlan: "recoveryPlan",
};

export const DEFAULT_STATE = {
  onboardingComplete: false,
  onboardingEstimateMinutesPerDay: null,
  timeBackGoals: [], // ids from TIME_BACK_REASONS
  usageLog: [], // [{ date, appName, minutes }]
  targetHistory: [], // [{ date, minutesPerDay }]
  appGoals: [], // existing per-app goal objects from lib/goals.js
  goals: [], // [{ id, title, category, why, active, createdAt, steps: [...] }] — see lib/purpose.js
  focusSessions: [], // [{ id, date, minutes, startedAt, completedAt }]
  activeFocusSession: null, // { id, durationMinutes, startedAt } | null
  challengeCompletions: [], // [{ id, date, challengeId, minutes, xp, completedAt }]
  reflections: [], // [{ id, date, minutes, category, loggedAt }]
  achievementsUnlocked: [], // [{ id, unlockedAt }]
  notificationsEnabled: true,
  // Daily minutes allocated per BUDGET_CATEGORIES id. Null until the user
  // sets one up in Settings — budget features stay hidden/empty until then
  // rather than assuming a default allocation nobody chose.
  timeBudget: null, // { goals, school, health, social, entertainment, other }
  appCategories: {}, // { [appName]: BUDGET_CATEGORIES id } — user-assigned in Settings
  // Premium is a LOCAL TEST TOGGLE for now, not a real subscription — see
  // Settings for the explicit "testing only" label. No payment processor is
  // wired up yet; this only exists so premium-gated features can be built
  // and verified ahead of adding real billing.
  isPremium: false,
  recoveryPlan: null, // { createdAt, weekStart, sessions: [{ date, minutes }] } | null
};

// Budget categories are deliberately a fixed, small set distinct from the
// per-goal TIME_BACK_REASONS below — a goal's category answers "what kind of
// goal is this," while a budget category answers "what bucket did this
// minute of my day go into." "Goals" as a budget category is fed by actual
// goal-linked focus session time, not by usage-log entries.
export const BUDGET_CATEGORIES = [
  { id: "goals", label: "Goals", icon: "🎯" },
  { id: "school", label: "School", icon: "🎓" },
  { id: "health", label: "Health", icon: "🏃" },
  { id: "social", label: "Social", icon: "👥" },
  { id: "entertainment", label: "Entertainment", icon: "🎮" },
  { id: "other", label: "Other", icon: "✦" },
];

export function budgetCategoryLabel(id) {
  return BUDGET_CATEGORIES.find((c) => c.id === id)?.label || "Other";
}
export function budgetCategoryIcon(id) {
  return BUDGET_CATEGORIES.find((c) => c.id === id)?.icon || "✦";
}

// Used both as the onboarding "what do you want your time back for" picks
// (legacy field, still stored) and as the category every specific Goal now
// carries, for icon/theming and to pick a starter-step template.
export const TIME_BACK_REASONS = [
  { id: "learn", label: "Learn something", icon: "📚" },
  { id: "school", label: "School", icon: "🎓" },
  { id: "exercise", label: "Exercise", icon: "🏋" },
  { id: "create", label: "Create", icon: "🎨" },
  { id: "work", label: "Work", icon: "💼" },
  { id: "people", label: "Spend time with people", icon: "🤝" },
  { id: "outside", label: "Get outside", icon: "🌳" },
  { id: "rest", label: "Rest", icon: "🌙" },
  { id: "project", label: "Personal project", icon: "🛠" },
  { id: "other", label: "Something else", icon: "✦" },
];

export function reasonIcon(categoryId) {
  return TIME_BACK_REASONS.find((r) => r.id === categoryId)?.icon || "✦";
}

export function reasonLabel(categoryId) {
  return TIME_BACK_REASONS.find((r) => r.id === categoryId)?.label || "Goal";
}
