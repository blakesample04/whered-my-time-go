// dateUtils.js
//
// All date handling for the app funnels through here, using LOCAL calendar
// dates (not UTC). This matters: `date.toISOString()` reports UTC, so
// anyone west of UTC has "today" flip over hours early — a real bug that
// existed in the first version of this app. Every "what day is it" question
// in the app should go through localDateISO(), not toISOString().

// 'YYYY-MM-DD' for a Date, using its LOCAL calendar date.
export function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return localDateISO(new Date());
}

// Parse a 'YYYY-MM-DD' string as a local-midnight Date (avoids the classic
// `new Date('2026-08-12')` UTC-parsing trap that can shift the date by a day).
export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return localDateISO(d);
}

// Difference in whole days between two 'YYYY-MM-DD' strings (b - a).
export function daysBetween(aIso, bIso) {
  const a = parseISODate(aIso);
  const b = parseISODate(bIso);
  return Math.round((b - a) / 86400000);
}

// Monday-start week. Returns the ISO date of that week's Monday.
export function startOfWeek(iso) {
  const d = parseISODate(iso);
  const dow = d.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateISO(d);
}

export function startOfMonth(iso) {
  const d = parseISODate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isSameOrAfter(aIso, bIso) {
  return aIso >= bIso; // ISO 'YYYY-MM-DD' strings sort correctly lexically
}

export function isSameOrBefore(aIso, bIso) {
  return aIso <= bIso;
}

export function dayOfWeekLabel(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: "long" });
}
