// reflections.js
//
// "What did you do with it?" — tracks what category of thing reclaimed
// time went toward. Purely additive log entries (never edits history),
// aggregated for the monthly breakdown on the Report screen.

export const REFLECTION_CATEGORIES = [
  { id: "create", label: "Created" },
  { id: "learn", label: "Learned" },
  { id: "exercise", label: "Exercised" },
  { id: "social", label: "Socialized" },
  { id: "rest", label: "Rested" },
  { id: "work", label: "Worked" },
  { id: "outside", label: "Went outside" },
  { id: "other", label: "Other" },
];

export function categoryLabel(id) {
  return REFLECTION_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

export function buildReflection(dateIso, minutes, categoryId) {
  return {
    id: `${dateIso}:${Date.now()}`,
    date: dateIso,
    minutes,
    category: categoryId,
    loggedAt: new Date().toISOString(),
  };
}

// { categoryId: totalMinutes }, only for reflections within [startIso, endIso].
export function aggregateByCategory(reflections, startIso, endIso) {
  const totals = {};
  for (const r of reflections) {
    if (r.date < startIso || r.date > endIso) continue;
    totals[r.category] = (totals[r.category] || 0) + r.minutes;
  }
  return totals;
}
