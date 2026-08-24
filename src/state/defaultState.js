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
};

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
