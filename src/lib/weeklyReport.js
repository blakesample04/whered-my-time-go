// weeklyReport.js
//
// This-week-vs-last-week is the primary comparison (self vs. self, not vs.
// other people — see product principle in the spec). Weeks are Monday-start
// and computed from whatever "today" is, so this works correctly no matter
// which day of the week the report is viewed on.

import { addDays, startOfWeek, isSameOrAfter, isSameOrBefore, dayOfWeekLabel, todayISO } from "./dateUtils";
import { trackedDates, totalUsageForDate, dailyReclaimedMinutes, safeMinutes } from "./reclaim";

function inRange(dateIso, startIso, endIso) {
  return isSameOrAfter(dateIso, startIso) && isSameOrBefore(dateIso, endIso);
}

function usageByApp(usageLog, startIso, endIso) {
  const totals = {};
  for (const entry of usageLog) {
    if (!inRange(entry.date, startIso, endIso)) continue;
    totals[entry.appName] = (totals[entry.appName] || 0) + safeMinutes(entry.minutes);
  }
  return totals;
}

function totalUsageInRange(usageLog, startIso, endIso) {
  return trackedDates(usageLog)
    .filter((d) => inRange(d, startIso, endIso))
    .reduce((sum, d) => sum + totalUsageForDate(d, usageLog), 0);
}

function totalReclaimedInRange(usageLog, targetHistory, startIso, endIso) {
  return trackedDates(usageLog)
    .filter((d) => inRange(d, startIso, endIso))
    .reduce((sum, d) => sum + (dailyReclaimedMinutes(d, usageLog, targetHistory) || 0), 0);
}

function mostImprovedApp(thisWeekByApp, lastWeekByApp) {
  let best = null;
  for (const app of Object.keys(lastWeekByApp)) {
    const before = lastWeekByApp[app];
    const after = thisWeekByApp[app] || 0;
    if (before < 5) continue; // ignore noise from barely-used apps
    const pctChange = ((before - after) / before) * 100;
    if (!best || pctChange > best.pctChange) {
      best = { appName: app, pctChange: Math.round(pctChange) };
    }
  }
  return best && best.pctChange > 0 ? best : null;
}

function biggestTimeSink(thisWeekByApp) {
  let best = null;
  for (const [appName, minutes] of Object.entries(thisWeekByApp)) {
    if (!best || minutes > best.minutes) best = { appName, minutes };
  }
  return best;
}

function bestDay(usageLog, targetHistory, startIso, endIso) {
  let best = null;
  for (const d of trackedDates(usageLog)) {
    if (!inRange(d, startIso, endIso)) continue;
    const reclaimed = dailyReclaimedMinutes(d, usageLog, targetHistory) || 0;
    if (!best || reclaimed > best.reclaimed) best = { date: d, reclaimed };
  }
  return best;
}

export function buildWeeklyReport(state, todayIso = todayISO()) {
  const { usageLog, targetHistory } = state;

  const thisWeekStart = startOfWeek(todayIso);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const thisWeekByApp = usageByApp(usageLog, thisWeekStart, thisWeekEnd);
  const lastWeekByApp = usageByApp(usageLog, lastWeekStart, lastWeekEnd);

  const thisWeekUsage = totalUsageInRange(usageLog, thisWeekStart, thisWeekEnd);
  const lastWeekUsage = totalUsageInRange(usageLog, lastWeekStart, lastWeekEnd);
  const thisWeekReclaimed = totalReclaimedInRange(usageLog, targetHistory, thisWeekStart, thisWeekEnd);
  const lastWeekReclaimed = totalReclaimedInRange(usageLog, targetHistory, lastWeekStart, lastWeekEnd);

  const best = bestDay(usageLog, targetHistory, thisWeekStart, thisWeekEnd);

  return {
    thisWeekStart,
    thisWeekEnd,
    thisWeekUsage,
    lastWeekUsage,
    usageChange: lastWeekUsage - thisWeekUsage, // positive = used less than last week
    thisWeekReclaimed,
    lastWeekReclaimed,
    reclaimedChange: thisWeekReclaimed - lastWeekReclaimed,
    mostImproved: mostImprovedApp(thisWeekByApp, lastWeekByApp),
    biggestTimeSink: biggestTimeSink(thisWeekByApp),
    bestDay: best ? { ...best, label: dayOfWeekLabel(best.date) } : null,
    nextWeekGoalMinutes: 30, // a modest, consistent nudge — see spec example
    hasEnoughData: trackedDates(usageLog).some((d) => inRange(d, thisWeekStart, thisWeekEnd)),
  };
}
