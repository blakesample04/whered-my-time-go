// streaks.js
//
// A streak day = a tracked day where usage was at/under that day's target.
// Deliberately forgiving: one missed calendar day is auto-covered by a
// "grace" token (earned every 7-day run, capped at 2 banked) so one bad
// day doesn't erase an otherwise-good run. Two or more days without a
// grace token available ends the run — but "ends" only ever resets the
// CURRENT counter; `longest` (used for XP/achievements) never decreases,
// so lifetime progress is never erased by a bad week.

import { daysBetween, todayISO } from "./dateUtils";
import { trackedDates, metTargetOnDate } from "./reclaim";

const GRACE_EARNED_EVERY_N_DAYS = 7;
const GRACE_MAX_BANKED = 2;

export function computeStreak(usageLog, targetHistory, nowIso = todayISO()) {
  const dates = trackedDates(usageLog);
  if (dates.length === 0) {
    return { current: 0, longest: 0, graceAvailable: 0, isActive: false };
  }

  let run = 0;
  let longest = 0;
  let grace = 0;
  let prevDate = null;

  for (const date of dates) {
    if (prevDate) {
      const gap = daysBetween(prevDate, date) - 1; // missing calendar days between logs
      if (gap === 1 && grace > 0) {
        grace -= 1; // one missed day, covered
      } else if (gap >= 1) {
        run = 0;
        grace = 0;
      }
    }

    if (metTargetOnDate(date, usageLog, targetHistory)) {
      run += 1;
      if (run % GRACE_EARNED_EVERY_N_DAYS === 0) {
        grace = Math.min(grace + 1, GRACE_MAX_BANKED);
      }
    } else {
      run = 0;
      grace = 0;
    }

    longest = Math.max(longest, run);
    prevDate = date;
  }

  // A run only counts as "current" if it's still fresh — the most recent
  // tracked day was today or yesterday. Otherwise it's gone stale (which
  // is different from having "failed" — see the encouraging copy in
  // lib/messages.js for how this gets communicated).
  const lastTracked = dates[dates.length - 1];
  const staleness = daysBetween(lastTracked, nowIso);
  const isActive = staleness <= 1;

  return {
    current: isActive ? run : 0,
    longest,
    graceAvailable: isActive ? grace : 0,
    isActive,
    lastTrackedDate: lastTracked,
  };
}
