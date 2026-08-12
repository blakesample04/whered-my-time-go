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
  focusSessions: [], // [{ id, date, minutes, startedAt, completedAt }]
  activeFocusSession: null, // { id, durationMinutes, startedAt } | null
  challengeCompletions: [], // [{ id, date, challengeId, minutes, xp, completedAt }]
  reflections: [], // [{ id, date, minutes, category, loggedAt }]
  achievementsUnlocked: [], // [{ id, unlockedAt }]
  notificationsEnabled: true,
};

export const TIME_BACK_REASONS = [
  { id: "learn", label: "Learn something" },
  { id: "school", label: "School" },
  { id: "exercise", label: "Exercise" },
  { id: "create", label: "Create" },
  { id: "work", label: "Work" },
  { id: "people", label: "Spend time with people" },
  { id: "outside", label: "Get outside" },
  { id: "rest", label: "Rest" },
  { id: "project", label: "Personal project" },
  { id: "other", label: "Something else" },
];
