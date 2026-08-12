// timeTranslator.js
//
// Pure logic for turning raw minutes into tangible, human comparisons.
// Deliberately has zero UI code and zero platform code (no browser APIs,
// no React) so this exact file can be reused as-is in the future Android
// app instead of being rewritten from scratch.

export const WAKING_HOURS_PER_DAY = 16; // used for "days of your waking life"

// Reference points most people intuitively understand, expressed in minutes.
// Add/remove entries here to change what shows up everywhere in the app.
export const COMPARISONS = [
  { id: "wakingDays", label: "full days of your waking life", unitMinutes: WAKING_HOURS_PER_DAY * 60 },
  { id: "nightsSleep", label: "full nights of sleep", unitMinutes: 8 * 60 },
  { id: "movies", label: "movies", unitMinutes: 2 * 60 },
  { id: "workdays", label: "8-hour workdays", unitMinutes: 8 * 60 },
  { id: "podcasts", label: "podcast episodes", unitMinutes: 45 },
  { id: "workouts", label: "one-hour workouts", unitMinutes: 60 },
];

export function formatNumber(n) {
  return Math.round(n * 10) / 10; // one decimal place
}

export function formatHoursMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToComparisons(totalMinutes) {
  return COMPARISONS.map((c) => ({
    id: c.id,
    label: c.label,
    value: formatNumber(totalMinutes / c.unitMinutes),
  }));
}

// The single headline sentence, e.g. "5.8 full days of your waking life"
export function headlineStat(totalMinutes) {
  const days = totalMinutes / (WAKING_HOURS_PER_DAY * 60);
  return `${formatNumber(days)} full days of your waking life`;
}
