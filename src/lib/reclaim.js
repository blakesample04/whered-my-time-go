// reclaim.js
//
// The core "Time Reclaimed" math. Deliberately DERIVES everything from the
// usage log + a target-history record rather than storing mutable running
// totals — this is what makes the numbers double-count-proof and immune to
// "changing your goal erases the past": a target change only affects days
// from that point forward, because every past day is evaluated against
// whatever target was active on that specific day.
//
// targetHistory: [{ date: 'YYYY-MM-DD', minutesPerDay }], sorted by date.
// The target "in effect" on any date is the most recent entry whose date is
// <= that date.

import { localDateISO, startOfWeek, startOfMonth, isSameOrAfter } from "./dateUtils";

// A sentinel date guaranteed to sort before any real usage date. The very
// first target a user ever sets (at onboarding) is recorded here instead of
// at "today" — so later same-day edits to today's target add a NEW entry
// dated today rather than overwriting this one. Without this, editing your
// target twice on your first day would retroactively change which target
// applies to any usage history that predates the app (e.g. an early CSV
// import), which would violate "changing a goal doesn't erase the past."
export const EPOCH_DATE = "0001-01-01";

export function targetForDate(targetHistory, dateIso) {
  if (!targetHistory || targetHistory.length === 0) return null;
  let active = null;
  for (const entry of targetHistory) {
    if (entry.date <= dateIso) active = entry;
    else break; // sorted ascending, so we can stop early
  }
  // If the date is before the first recorded target, fall back to the
  // earliest known target rather than returning null — a user shouldn't
  // lose "reclaimed" credit for days before they set a goal in the app,
  // as long as we have *some* target to compare against.
  return active ? active.minutesPerDay : targetHistory[0].minutesPerDay;
}

export function addTargetChange(targetHistory, dateIso, minutesPerDay) {
  const withoutSameDay = targetHistory.filter((t) => t.date !== dateIso);
  return [...withoutSameDay, { date: dateIso, minutesPerDay }].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );
}

// Defensive against corrupted persisted data (a hand-edited localStorage
// value, a bad CSV row that slipped past validation, a record written by a
// future/foreign app version): a usage/session minutes value should always
// be treated as a finite, non-negative number, never NaN/Infinity/negative,
// since those would otherwise poison every sum built from it (time bank,
// streaks, XP, budget, weekly report).
export function safeMinutes(n) {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function totalUsageForDate(dateIso, usageLog) {
  return usageLog
    .filter((u) => u.date === dateIso)
    .reduce((sum, u) => sum + safeMinutes(u.minutes), 0);
}

// All distinct dates the user actually has usage data for — i.e. "tracked days".
export function trackedDates(usageLog) {
  return [...new Set(usageLog.map((u) => u.date))].sort();
}

// Reclaimed minutes for one day. Never negative — a rough day banks 0, not
// a debt. Returns null if there's no target to compare against yet.
export function dailyReclaimedMinutes(dateIso, usageLog, targetHistory) {
  const target = targetForDate(targetHistory, dateIso);
  if (target == null) return null;
  const used = totalUsageForDate(dateIso, usageLog);
  return Math.max(0, target - used);
}

export function metTargetOnDate(dateIso, usageLog, targetHistory) {
  const target = targetForDate(targetHistory, dateIso);
  if (target == null) return false;
  return totalUsageForDate(dateIso, usageLog) <= target;
}

// --- Time Bank -----------------------------------------------------------
//
// Total banked minutes = reclaimed-vs-target across every tracked day, PLUS
// completed focus sessions, PLUS completed challenges. Each of those three
// sources writes into its own record with a unique id, so re-rendering or
// re-importing data never double-counts: daily reclaim is recomputed fresh
// from the log each time (not stored), and sessions/challenges are only
// ever appended once, on completion.

export function computeTimeBank(state, todayIso = localDateISO()) {
  const { usageLog, targetHistory, focusSessions, challengeCompletions } = state;
  const weekStart = startOfWeek(todayIso);
  const monthStart = startOfMonth(todayIso);

  let allTime = 0;
  let today = 0;
  let week = 0;
  let month = 0;

  for (const dateIso of trackedDates(usageLog)) {
    const reclaimed = dailyReclaimedMinutes(dateIso, usageLog, targetHistory) || 0;
    allTime += reclaimed;
    if (dateIso === todayIso) today += reclaimed;
    if (isSameOrAfter(dateIso, weekStart)) week += reclaimed;
    if (isSameOrAfter(dateIso, monthStart)) month += reclaimed;
  }

  for (const session of focusSessions) {
    const minutes = safeMinutes(session.minutes);
    allTime += minutes;
    if (session.date === todayIso) today += minutes;
    if (isSameOrAfter(session.date, weekStart)) week += minutes;
    if (isSameOrAfter(session.date, monthStart)) month += minutes;
  }

  for (const c of challengeCompletions) {
    const minutes = safeMinutes(c.minutes);
    allTime += minutes;
    if (c.date === todayIso) today += minutes;
    if (isSameOrAfter(c.date, weekStart)) week += minutes;
    if (isSameOrAfter(c.date, monthStart)) month += minutes;
  }

  return { today, week, month, allTime };
}

// --- Baseline --------------------------------------------------------------
//
// "What does this person's phone use normally look like?" Prefer real
// history; fall back to whatever they told us during onboarding.
export function computeBaselineMinutesPerDay(usageLog, onboardingEstimateMinutesPerDay) {
  const dates = trackedDates(usageLog);
  if (dates.length >= 3) {
    const recent = dates.slice(-14); // most recent up to 14 tracked days
    const total = recent.reduce((sum, d) => sum + totalUsageForDate(d, usageLog), 0);
    return Math.round(total / recent.length);
  }
  return onboardingEstimateMinutesPerDay ?? null;
}

// Clearly-labeled estimate, not a promise. ~365.25 days/year.
export function projectAnnualHours(minutesReclaimedPerDay) {
  return Math.round((minutesReclaimedPerDay * 365.25) / 60);
}
