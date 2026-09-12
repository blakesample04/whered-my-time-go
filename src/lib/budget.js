// budget.js
//
// Daily Time Budget: how the user planned to allocate their discretionary
// time across categories, vs. how it actually went. Pure functions over the
// same usageLog/focusSessions the rest of the app already uses — "Goals"
// time comes from goal-linked focus sessions (lib/purpose.js sessions with a
// goalId), everything else comes from categorized usage-log entries.

import { BUDGET_CATEGORIES } from "../state/defaultState";
import { safeMinutes } from "./reclaim";

export function categoryForApp(appName, appCategories) {
  return appCategories[appName] || "other";
}

// Minutes spent in one budget category on one date.
export function categoryMinutesForDate(categoryId, dateIso, { usageLog, appCategories, focusSessions }) {
  if (categoryId === "goals") {
    return focusSessions
      .filter((s) => s.date === dateIso && s.goalId)
      .reduce((sum, s) => sum + safeMinutes(s.minutes), 0);
  }
  return usageLog
    .filter((u) => u.date === dateIso && categoryForApp(u.appName, appCategories) === categoryId)
    .reduce((sum, u) => sum + safeMinutes(u.minutes), 0);
}

// { [categoryId]: minutesUsed } for every budget category on one date.
export function usageByCategoryForDate(dateIso, state) {
  const out = {};
  for (const c of BUDGET_CATEGORIES) {
    out[c.id] = categoryMinutesForDate(c.id, dateIso, state);
  }
  return out;
}

export function totalBudgetMinutes(timeBudget) {
  if (!timeBudget) return 0;
  return BUDGET_CATEGORIES.reduce((sum, c) => sum + (timeBudget[c.id] || 0), 0);
}

export function totalUsedMinutes(usageByCategory) {
  return Object.values(usageByCategory).reduce((sum, v) => sum + v, 0);
}

// How much of the day's planned discretionary time is still unspent.
// Never negative — going over budget in one category doesn't produce a
// negative "time left," it just means less is available for the rest.
export function discretionaryRemaining(timeBudget, usageByCategory) {
  return Math.max(0, totalBudgetMinutes(timeBudget) - totalUsedMinutes(usageByCategory));
}

// [{ id, label, icon, budget, used, remaining, overBy }] per category —
// the raw data behind the "Budget: 2h · Used: 2h47m · +47m over" rows.
export function budgetComparison(timeBudget, usageByCategory) {
  return BUDGET_CATEGORIES.map((c) => {
    const budget = timeBudget?.[c.id] || 0;
    const used = usageByCategory[c.id] || 0;
    return {
      id: c.id,
      label: c.label,
      icon: c.icon,
      budget,
      used,
      remaining: Math.max(0, budget - used),
      overBy: Math.max(0, used - budget),
    };
  });
}

// Today's short "priorities" list for the dashboard: remaining budget per
// category, Goals always first (it's the point of the app), the rest
// ranked by remaining minutes, capped to a few so it stays glanceable.
export function todaysPriorities(timeBudget, usageByCategory, { max = 3 } = {}) {
  if (!timeBudget) return [];
  const rows = budgetComparison(timeBudget, usageByCategory).filter((r) => r.budget > 0 && r.remaining > 0);
  const goalsRow = rows.find((r) => r.id === "goals");
  const rest = rows.filter((r) => r.id !== "goals").sort((a, b) => b.remaining - a.remaining);
  const ordered = goalsRow ? [goalsRow, ...rest] : rest;
  return ordered.slice(0, max);
}
