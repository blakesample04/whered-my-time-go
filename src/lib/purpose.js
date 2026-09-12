// purpose.js
//
// The "why" layer: a Goal is a specific thing someone is working toward
// (not just a category), broken into concrete steps. Named separately from
// lib/goals.js, which is a different, older feature (optional per-app
// screen-time limits) — the two aren't related and shouldn't be confused.
//
// Deliberately NOT AI-generated step suggestions: goalTemplates.js below is
// static, curated starter scaffolding per category, honest about being a
// generic nudge rather than pretending to be personalized expert advice for
// an arbitrary goal.

export function createGoal({ title, category, why, isActive, weeklyTargetMinutes, targetDate }) {
  return {
    id: `goal:${Date.now()}`,
    title: title.trim(),
    category,
    why: (why || "").trim(),
    active: !!isActive,
    createdAt: new Date().toISOString(),
    // Both optional and additive — older goals simply have these as null,
    // and every screen that reads them treats null as "not set" rather
    // than assuming a value.
    weeklyTargetMinutes: weeklyTargetMinutes || null,
    targetDate: targetDate || null,
    steps: [],
  };
}

export function createStep(text) {
  return { id: `step:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, text: text.trim(), done: false, doneAt: null };
}

export function goalProgress(goal) {
  if (!goal || goal.steps.length === 0) return { done: 0, total: 0, fraction: 0 };
  const done = goal.steps.filter((s) => s.done).length;
  return { done, total: goal.steps.length, fraction: done / goal.steps.length };
}

export function nextStep(goal) {
  if (!goal) return null;
  return goal.steps.find((s) => !s.done) || null;
}

export function activeGoalOf(goals) {
  if (!goals || goals.length === 0) return null;
  return goals.find((g) => g.active) || goals[0];
}

// --- time-vs-progress: how much real time has actually gone into a goal ---

import { startOfWeek, addDays, parseISODate } from "./dateUtils";
import { safeMinutes } from "./reclaim";

export function goalMinutesInvested(goal, focusSessions) {
  if (!goal) return 0;
  return focusSessions.filter((s) => s.goalId === goal.id).reduce((sum, s) => sum + safeMinutes(s.minutes), 0);
}

export function goalMinutesThisWeek(goal, focusSessions, todayIso) {
  if (!goal) return 0;
  const weekStart = startOfWeek(todayIso);
  const weekEnd = addDays(weekStart, 6);
  return focusSessions
    .filter((s) => s.goalId === goal.id && s.date >= weekStart && s.date <= weekEnd)
    .reduce((sum, s) => sum + safeMinutes(s.minutes), 0);
}

const DEFAULT_STEP_MINUTES = 45; // fallback effort-per-step assumption, used only until there's real pace data

// A rough, clearly-labeled estimate — never presented as a guarantee.
// Prefers actual completion pace (steps done per week so far) once there's
// enough history; falls back to a generic effort-per-step assumption
// against the weekly target for a brand-new goal.
export function estimateCompletionDate(goal, focusSessions, todayIso) {
  if (!goal) return null;
  const { done, total } = goalProgress(goal);
  const remainingSteps = total - done;
  if (remainingSteps <= 0) return null; // already done, or no steps to estimate against

  // parseISODate(todayIso), not new Date(todayIso) — a bare 'YYYY-MM-DD'
  // string is parsed by the Date constructor as UTC midnight, not local
  // midnight (the exact trap dateUtils.js documents and works around
  // elsewhere), which would shift this by up to a day off-UTC and could
  // flip the week-count rounding below.
  const weeksSinceCreated = Math.max(1, Math.round((parseISODate(todayIso) - new Date(goal.createdAt)) / (7 * 86400000)));
  const paceStepsPerWeek = weeksSinceCreated >= 1 && done > 0 ? done / weeksSinceCreated : null;

  let weeksNeeded;
  if (paceStepsPerWeek && paceStepsPerWeek > 0) {
    weeksNeeded = remainingSteps / paceStepsPerWeek;
  } else if (goal.weeklyTargetMinutes) {
    const sessionsPerWeek = goal.weeklyTargetMinutes / DEFAULT_STEP_MINUTES;
    if (sessionsPerWeek <= 0) return null;
    weeksNeeded = remainingSteps / sessionsPerWeek;
  } else {
    return null; // not enough information to estimate at all yet
  }

  return addDays(todayIso, Math.max(7, Math.round(weeksNeeded * 7)));
}
