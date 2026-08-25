// recovery.js
//
// If a goal has fallen behind its weekly time target, suggest a realistic
// plan to catch up — spread across the days left in the week rather than
// demanding one big catch-up session. Returns null whenever there's nothing
// useful to suggest (on track, no target set, or no days left this week).

import { addDays, startOfWeek } from "./dateUtils";

const MIN_SHORTFALL_TO_SUGGEST = 15; // don't nag over a trivial gap
const MIN_SESSION_MINUTES = 15;
const MAX_SESSION_MINUTES = 45;

export function computeRecoveryPlan(goal, focusSessions, todayIso) {
  if (!goal || !goal.weeklyTargetMinutes) return null;

  const weekStart = startOfWeek(todayIso);
  const weekEnd = addDays(weekStart, 6);
  const thisWeekMinutes = focusSessions
    .filter((s) => s.goalId === goal.id && s.date >= weekStart && s.date <= weekEnd)
    .reduce((sum, s) => sum + s.minutes, 0);

  const shortfall = goal.weeklyTargetMinutes - thisWeekMinutes;
  if (shortfall < MIN_SHORTFALL_TO_SUGGEST) return null;

  const remainingDays = [];
  for (let d = addDays(todayIso, 1); d <= weekEnd; d = addDays(d, 1)) remainingDays.push(d);
  if (remainingDays.length === 0) return null;

  const sessionCount = Math.min(remainingDays.length, Math.max(1, Math.ceil(shortfall / MAX_SESSION_MINUTES)));
  const step = remainingDays.length / sessionCount;
  const chosenDays = Array.from({ length: sessionCount }, (_, i) =>
    remainingDays[Math.min(remainingDays.length - 1, Math.round(i * step))]
  );

  const perSession = Math.max(MIN_SESSION_MINUTES, Math.round(shortfall / sessionCount / 5) * 5);
  const sessions = chosenDays.map((date) => ({ date, minutes: perSession }));

  return { shortfallMinutes: shortfall, weekStart, weekEnd, thisWeekMinutes, sessions };
}
