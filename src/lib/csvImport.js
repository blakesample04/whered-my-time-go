// csvImport.js
//
// Turns a raw CSV export (from a phone's screen-time tool, a spreadsheet,
// wherever) into usage entries: { date, appName, minutes }. Deliberately
// forgiving about column names and how duration is written, since every
// export tool formats things a little differently.
//
// No UI/platform code here either, for the same reuse reason as the other
// lib files.

// --- CSV text -> rows of strings -------------------------------------------------

// A small hand-rolled parser (no dependency) that still handles quoted
// fields, escaped quotes (""), and commas/newlines inside quotes.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  // last field/row, if the file didn't end with a newline
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export function splitHeaderAndRows(rows) {
  if (rows.length === 0) return { headers: [], dataRows: [] };
  return { headers: rows[0].map((h) => h.trim()), dataRows: rows.slice(1) };
}

// --- Column guessing ---------------------------------------------------------

const DATE_ALIASES = ["date", "day"];
const APP_ALIASES = ["app", "app name", "application", "package name", "package"];
const MINUTES_ALIASES = [
  "minutes",
  "duration",
  "usage time (minutes)",
  "usage minutes",
  "time spent",
  "usage",
  "duration (min)",
  "duration (minutes)",
];

function findAlias(headers, aliases) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  // fall back to a loose "contains" match
  for (let i = 0; i < lower.length; i++) {
    if (aliases.some((a) => lower[i].includes(a))) return i;
  }
  return -1;
}

export function guessColumnMapping(headers) {
  return {
    dateCol: findAlias(headers, DATE_ALIASES),
    appCol: findAlias(headers, APP_ALIASES),
    minutesCol: findAlias(headers, MINUTES_ALIASES),
  };
}

// --- Duration parsing ---------------------------------------------------------

// Accepts: "83", "83.5", "1h 23m", "1:23:00" (H:MM:SS), "23:00" (MM:SS)
export function parseDurationToMinutes(raw) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (value === "") return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const hm = value.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/i);
  if (hm) {
    const h = Number(hm[1]);
    const m = hm[2] ? Number(hm[2]) : 0;
    return h * 60 + m;
  }

  const justH = value.match(/^(\d+(?:\.\d+)?)\s*h$/i);
  if (justH) return Number(justH[1]) * 60;

  const justM = value.match(/^(\d+(?:\.\d+)?)\s*m(?:in)?$/i);
  if (justM) return Number(justM[1]);

  const colonParts = value.split(":").map((p) => p.trim());
  if (colonParts.length === 3 && colonParts.every((p) => /^\d+$/.test(p))) {
    const [h, m, s] = colonParts.map(Number);
    return h * 60 + m + s / 60;
  }
  if (colonParts.length === 2 && colonParts.every((p) => /^\d+$/.test(p))) {
    const [m, s] = colonParts.map(Number);
    return m + s / 60;
  }

  return null;
}

// --- Date normalization ---------------------------------------------------------

// Accepts common formats and returns 'YYYY-MM-DD', or null if unparseable.
export function normalizeDate(raw) {
  if (!raw) return null;
  const value = String(raw).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    // Use the LOCAL calendar date, not .toISOString() (which reports UTC) —
    // see the identical trap documented in dateUtils.js. Converting to UTC
    // here would shift the date by a day for anyone not at UTC+0.
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

// --- Putting it together ---------------------------------------------------------

// dataRows: array of arrays (from splitHeaderAndRows)
// mapping: { dateCol, appCol, minutesCol } (indexes)
// Returns { entries, skipped } where skipped is a count of unparseable rows.
export function normalizeRows(dataRows, mapping) {
  const entries = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (row.every((c) => c.trim() === "")) continue; // blank line
    const date = normalizeDate(row[mapping.dateCol]);
    const appName = (row[mapping.appCol] || "").trim();
    const minutes = parseDurationToMinutes(row[mapping.minutesCol]);

    if (!date || !appName || minutes == null || minutes <= 0) {
      skipped++;
      continue;
    }
    entries.push({ date, appName, minutes: Math.round(minutes * 10) / 10 });
  }

  return { entries, skipped };
}
