// xp.js
//
// XP is DERIVED from real logged events (tracked days, completed focus
// sessions, completed challenges, streak length), never a mutable counter
// you could inflate by spamming the same action — each source can only
// contribute once per calendar date (or once per session/challenge id),
// so re-rendering or re-importing data can't create extra XP.

import { trackedDates, dailyReclaimedMinutes, metTargetOnDate } from "./reclaim";
import { computeStreak } from "./streaks";

// Levels are configurable: each entry is the cumulative XP required to
// REACH that level. Add more rows to extend progression.
export const LEVELS = [
  { level: 1, title: "Aware", xpRequired: 0 },
  { level: 2, title: "Waking Up", xpRequired: 100 },
  { level: 3, title: "Intentional", xpRequired: 250 },
  { level: 4, title: "Breaking Free", xpRequired: 450 },
  { level: 5, title: "Taking Back Time", xpRequired: 700 },
  { level: 6, title: "Time Conscious", xpRequired: 1000 },
  { level: 7, title: "Time Rich", xpRequired: 1400 },
  { level: 8, title: "Own Your Time", xpRequired: 1900 },
];

// Every level past the table keeps the last title and keeps costing 20% more
// XP than the previous gap, so progression never dead-ends.
function extendedLevelRequirement(levelNumber) {
  const last = LEVELS[LEVELS.length - 1];
  if (levelNumber <= last.level) return LEVELS.find((l) => l.level === levelNumber).xpRequired;
  let xp = last.xpRequired;
  let gap = last.xpRequired - LEVELS[LEVELS.length - 2].xpRequired;
  for (let lv = last.level + 1; lv <= levelNumber; lv++) {
    gap = Math.round(gap * 1.2);
    xp += gap;
  }
  return xp;
}

export function levelTitleFor(levelNumber) {
  const known = LEVELS.find((l) => l.level === levelNumber);
  if (known) return known.title;
  return `${LEVELS[LEVELS.length - 1].title} (Lv. ${levelNumber})`;
}

export function computeLevel(totalXp) {
  let levelNumber = 1;
  while (extendedLevelRequirement(levelNumber + 1) <= totalXp) {
    levelNumber += 1;
  }
  const currentFloor = extendedLevelRequirement(levelNumber);
  const nextCeiling = extendedLevelRequirement(levelNumber + 1);
  const xpIntoLevel = totalXp - currentFloor;
  const xpForNext = nextCeiling - currentFloor;
  return {
    level: levelNumber,
    title: levelTitleFor(levelNumber),
    totalXp,
    xpIntoLevel,
    xpForNext,
    progress: xpForNext > 0 ? Math.min(1, xpIntoLevel / xpForNext) : 1,
  };
}

// --- XP rules ---------------------------------------------------------------

export const XP_RULES = {
  dailyTargetMet: 20,
  reclaimTier15: 5,
  reclaimTier30: 10,
  reclaimTier60: 20,
  challengeComplete: 15,
  focusXpPerMinute: 1,
  focusXpCapPerSession: 60, // sanity cap; real elapsed time still has to pass
  streakMilestones: { 7: 30, 14: 60, 30: 150, 60: 300, 100: 600 },
};

function reclaimTierXp(reclaimedMinutes) {
  if (reclaimedMinutes >= 60) return XP_RULES.reclaimTier60;
  if (reclaimedMinutes >= 30) return XP_RULES.reclaimTier30;
  if (reclaimedMinutes >= 15) return XP_RULES.reclaimTier15;
  return 0;
}

export function computeXpBreakdown(state) {
  const { usageLog, targetHistory, focusSessions, challengeCompletions } = state;

  let dailyXp = 0;
  for (const date of trackedDates(usageLog)) {
    if (metTargetOnDate(date, usageLog, targetHistory)) dailyXp += XP_RULES.dailyTargetMet;
    const reclaimed = dailyReclaimedMinutes(date, usageLog, targetHistory) || 0;
    dailyXp += reclaimTierXp(reclaimed);
  }

  const focusXp = focusSessions.reduce(
    (sum, s) => sum + Math.min(s.minutes, XP_RULES.focusXpCapPerSession) * XP_RULES.focusXpPerMinute,
    0
  );

  const challengeXp = challengeCompletions.length * XP_RULES.challengeComplete;

  const { longest } = computeStreak(usageLog, targetHistory);
  let streakXp = 0;
  for (const [threshold, bonus] of Object.entries(XP_RULES.streakMilestones)) {
    if (longest >= Number(threshold)) streakXp += bonus;
  }

  const total = dailyXp + focusXp + challengeXp + streakXp;
  return { dailyXp, focusXp, challengeXp, streakXp, total };
}

export function computeTotalXp(state) {
  return computeXpBreakdown(state).total;
}
