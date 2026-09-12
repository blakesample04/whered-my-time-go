// patterns.js
//
// Personal usage/focus patterns, computed from real history — no AI call,
// just aggregation over data the app already has (focusSessions,
// usageLog). Needs a reasonable amount of history to say anything useful;
// callers should treat a null return as "not enough data yet," not an error.

import { parseISODate } from "./dateUtils";
import { categoryForApp } from "./budget";
import { safeMinutes } from "./reclaim";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MIN_SESSIONS_FOR_PATTERN = 3;
const MIN_TRACKED_DAYS_FOR_PATTERN = 5;

export function avgGoalSessionMinutes(focusSessions) {
  const goalSessions = focusSessions.filter((s) => s.goalId);
  if (goalSessions.length === 0) return null;
  return Math.round(goalSessions.reduce((sum, s) => sum + safeMinutes(s.minutes), 0) / goalSessions.length);
}

// A 2-hour window around whichever hour most goal sessions started in.
export function bestFocusWindow(focusSessions) {
  const goalSessions = focusSessions.filter((s) => s.goalId && s.startedAt);
  if (goalSessions.length < MIN_SESSIONS_FOR_PATTERN) return null;

  const counts = new Array(24).fill(0);
  for (const s of goalSessions) counts[new Date(s.startedAt).getHours()] += 1;
  const peakHour = counts.indexOf(Math.max(...counts));

  const fmt = (h) => {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };
  return `${fmt(peakHour)}–${fmt((peakHour + 2) % 24)}`;
}

function totalsByWeekday(entries, getMinutes) {
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const e of entries) {
    const dow = parseISODate(e.date).getDay();
    totals[dow] += safeMinutes(getMinutes(e));
    counts[dow] += 1;
  }
  return totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0));
}

export function mostProductiveDay(focusSessions) {
  const goalSessions = focusSessions.filter((s) => s.goalId);
  if (goalSessions.length < MIN_SESSIONS_FOR_PATTERN) return null;
  const avgs = totalsByWeekday(goalSessions, (s) => s.minutes);
  const best = avgs.indexOf(Math.max(...avgs));
  return avgs[best] > 0 ? DAY_NAMES[best] : null;
}

export function mostDistractingDay(usageLog, appCategories) {
  const entertainment = usageLog.filter((u) => categoryForApp(u.appName, appCategories) === "entertainment");
  if (new Set(entertainment.map((u) => u.date)).size < MIN_TRACKED_DAYS_FOR_PATTERN) return null;
  const avgs = totalsByWeekday(entertainment, (u) => u.minutes);
  const worst = avgs.indexOf(Math.max(...avgs));
  return avgs[worst] > 0 ? DAY_NAMES[worst] : null;
}

export function biggestDistraction(usageLog, appCategories) {
  if (usageLog.length === 0) return null;
  const totals = {};
  for (const u of usageLog) {
    const cat = categoryForApp(u.appName, appCategories);
    if (cat === "goals") continue;
    totals[cat] = (totals[cat] || 0) + safeMinutes(u.minutes);
  }
  const entries = Object.entries(totals);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function computePatterns(state) {
  const { usageLog, appCategories, focusSessions } = state;
  return {
    bestFocusWindow: bestFocusWindow(focusSessions),
    mostProductiveDay: mostProductiveDay(focusSessions),
    mostDistractingDay: mostDistractingDay(usageLog, appCategories),
    biggestDistraction: biggestDistraction(usageLog, appCategories),
    avgGoalSessionMinutes: avgGoalSessionMinutes(focusSessions),
    hasEnoughData:
      focusSessions.filter((s) => s.goalId).length >= MIN_SESSIONS_FOR_PATTERN ||
      new Set(usageLog.map((u) => u.date)).size >= MIN_TRACKED_DAYS_FOR_PATTERN,
  };
}
