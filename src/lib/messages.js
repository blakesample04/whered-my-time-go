// messages.js
//
// Every piece of encouraging/status copy on the Home screen is chosen here,
// in one place — so the app's tone stays consistent and auditable. Nothing
// here should ever use shaming language ("wasted", "failed", "bad job").
// A rough day always reads as "still here, try again tomorrow," never as
// a verdict on the user.

import { formatHoursMinutes } from "./timeTranslator";

export function homeMessage({ hasLoggedToday, reclaimedToday, usageToday, target, weekReclaimed, streak }) {
  if (target == null) {
    return {
      headline: "Set a daily target to start tracking reclaimed time.",
      sub: "Head to Settings to set one — you can change it any time.",
    };
  }

  if (!hasLoggedToday) {
    return {
      headline: "No screen time logged for today yet.",
      sub: "Log or import today's usage to see what you've reclaimed so far.",
    };
  }

  if (reclaimedToday > 0) {
    const lines = [`You reclaimed ${formatHoursMinutes(reclaimedToday)} today.`];
    if (usageToday <= target * 0.7) lines.push("You're well ahead of your goal.");
    else lines.push("You're ahead of your goal.");
    if (weekReclaimed > 0) lines.push(`You've taken back ${formatHoursMinutes(weekReclaimed)} this week.`);
    return { headline: lines[0], sub: lines.slice(1).join(" ") };
  }

  // Over target today — this is the case that must never read as a scolding.
  if (streak.longest > 0) {
    return {
      headline: "Your progress is still here.",
      sub: `Today's over target, but your ${streak.longest}-day best run and ${formatHoursMinutes(weekReclaimed)} reclaimed this week aren't going anywhere. Tomorrow is another chance.`,
    };
  }
  return {
    headline: "Your progress is still here.",
    sub: "Tomorrow is another chance.",
  };
}

export function streakEndedMessage() {
  return "Your run ended. Your progress didn't.";
}
