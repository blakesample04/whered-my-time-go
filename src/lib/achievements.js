// achievements.js
//
// A modular registry: each achievement is just an id + copy + a pure
// `check(ctx)` function. Add a row to unlock a new achievement — nothing
// else in the app needs to change. `ctx` is the shape built by
// lib/derive.js (see buildAchievementContext below for exactly what's on it).

import { trackedDates, totalUsageForDate, metTargetOnDate } from "./reclaim";
import { parseISODate } from "./dateUtils";

export function buildAchievementContext(state, timeBank, streak) {
  const { usageLog, targetHistory } = state;
  const dates = trackedDates(usageLog);

  const metDates = dates.filter((d) => metTargetOnDate(d, usageLog, targetHistory));

  // Weekend = met target on a logged Saturday AND Sunday of the same week.
  const bySaturday = new Set();
  const bySunday = new Set();
  for (const d of dates) {
    const dow = parseISODate(d).getDay();
    if (dow === 6) bySaturday.add(d);
    if (dow === 0) bySunday.add(d);
  }
  const metWeekend =
    [...bySaturday].some((sat) => metTargetOnDate(sat, usageLog, targetHistory)) &&
    [...bySunday].some((sun) => metTargetOnDate(sun, usageLog, targetHistory));

  // "Changed your routine": compare the average of the most recent 7
  // tracked days against the 7 tracked days before that.
  let routineChangeMinutes = 0;
  if (dates.length >= 14) {
    const recent7 = dates.slice(-7);
    const prior7 = dates.slice(-14, -7);
    const avg = (arr) => arr.reduce((s, d) => s + totalUsageForDate(d, usageLog), 0) / arr.length;
    routineChangeMinutes = avg(prior7) - avg(recent7); // positive = usage went down
  }

  return {
    metDatesCount: metDates.length,
    metWeekend,
    timeBankAllTime: timeBank.allTime,
    timeBankWeek: timeBank.week,
    longestStreak: streak.longest,
    routineChangeMinutes,
  };
}

export const ACHIEVEMENTS = [
  {
    id: "first_step",
    title: "First Step",
    description: "Meet your target for the first time.",
    check: (ctx) => ctx.metDatesCount >= 1,
  },
  {
    id: "weekend",
    title: "Weekend",
    description: "Meet your target Saturday and Sunday.",
    check: (ctx) => ctx.metWeekend,
  },
  {
    id: "five_hours_back",
    title: "Five Hours Back",
    description: "Reclaim 5 total hours.",
    check: (ctx) => ctx.timeBankAllTime >= 5 * 60,
  },
  {
    id: "the_week",
    title: "The Week",
    description: "Reclaim 7+ hours in a single week.",
    check: (ctx) => ctx.timeBankWeek >= 7 * 60,
  },
  {
    id: "hundred_hours",
    title: "100 Hours",
    description: "Reclaim 100 lifetime hours.",
    check: (ctx) => ctx.timeBankAllTime >= 100 * 60,
  },
  {
    id: "changed_routine",
    title: "Changed Your Routine",
    description: "Reduce your average screen time by 30+ minutes, sustained over a week.",
    check: (ctx) => ctx.routineChangeMinutes >= 30,
  },
  {
    id: "two_week_streak",
    title: "Two Weeks In",
    description: "Reach a 14-day streak.",
    check: (ctx) => ctx.longestStreak >= 14,
  },
];

// Returns [{ ...achievement, unlocked: bool }]. Unlock DATES are tracked
// separately in persisted state (see AppStateContext) so that once
// something unlocks, it stays unlocked even if later stats dip — you don't
// lose an achievement because of a bad week.
export function evaluateAchievements(ctx, alreadyUnlockedIds) {
  const unlockedSet = new Set(alreadyUnlockedIds);
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlockedSet.has(a.id) || a.check(ctx),
  }));
}

export function newlyUnlockedIds(ctx, alreadyUnlockedIds) {
  const unlockedSet = new Set(alreadyUnlockedIds);
  return ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id) && a.check(ctx)).map((a) => a.id);
}
