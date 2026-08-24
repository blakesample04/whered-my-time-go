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

export function createGoal({ title, category, why, isActive }) {
  return {
    id: `goal:${Date.now()}`,
    title: title.trim(),
    category,
    why: (why || "").trim(),
    active: !!isActive,
    createdAt: new Date().toISOString(),
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
