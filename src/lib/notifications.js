// notifications.js
//
// IMPORTANT / PLATFORM LIMITATION: this is a web app running in a browser
// preview, so there is no real OS push notification channel available (that
// needs either a native app or a backend + the browser Push API + a service
// worker, none of which exist here). This module is the abstraction the
// spec asked for: a typed list of reminder kinds, and a pure function that
// decides which ones are "due" right now. The Settings screen renders
// whatever comes back as an in-app "Reminders" list (a realistic mock of
// what real push notifications would say) rather than faking a system
// notification. Swapping in real push later means implementing a delivery
// layer that calls getPendingReminders() — this decision logic doesn't change.

import { todayISO } from "./dateUtils";

export const REMINDER_TYPES = {
  DAILY_PROGRESS: "daily_progress",
  DAILY_CHALLENGE: "daily_challenge",
  WEEKLY_REPORT: "weekly_report",
  STREAK_REMINDER: "streak_reminder",
  MILESTONE: "milestone",
};

// Deliberately capped and de-duplicated per day so this can never spam —
// at most one of each type per day, and only if notifications are enabled.
export function getPendingReminders({ notificationsEnabled, todayIso = todayISO() }, derived) {
  if (!notificationsEnabled) return [];
  const reminders = [];

  if (derived.timeBank.today === 0 && derived.usageToday === 0) {
    reminders.push({
      id: `progress:${todayIso}`,
      type: REMINDER_TYPES.DAILY_PROGRESS,
      title: "How's today going?",
      body: "Log today's screen time to see what you've reclaimed so far.",
    });
  }

  if (derived.challenge && !derived.challenge.completed) {
    reminders.push({
      id: `challenge:${todayIso}`,
      type: REMINDER_TYPES.DAILY_CHALLENGE,
      title: "Today's challenge is still open",
      body: derived.challenge.title,
    });
  }

  if (derived.streak.isActive && derived.streak.current >= 3) {
    reminders.push({
      id: `streak:${todayIso}`,
      type: REMINDER_TYPES.STREAK_REMINDER,
      title: `Your ${derived.streak.current}-day run is still going`,
      body: "Stay under today's target to keep it alive.",
    });
  }

  if (todayIso.endsWith("-01")) {
    // cheap monthly-ish nudge placeholder; weekly report nudge is handled
    // by the Report screen itself surfacing "new" reports on Monday
  }

  return reminders.slice(0, 3); // never overwhelm
}
