// challenges.js
//
// A rotating pool of small, achievable daily challenges. The day's pick is
// DETERMINISTIC (hashed from the date), so it's consistent across reloads
// without needing to store "today's challenge" separately — we only need
// to persist completions.

import { XP_RULES } from "./xp";

export const CHALLENGE_POOL = [
  { id: "phone_down_30", title: "Put your phone down for 30 minutes", description: "One uninterrupted 30-minute stretch, phone out of reach.", minutesReward: 15 },
  { id: "no_social_before_9", title: "No social media before 9 AM", description: "Give your morning to yourself before you give it to your feed.", minutesReward: 15 },
  { id: "phone_free_meal", title: "Keep your phone away during one meal", description: "Just you (and whoever you're with), no screen.", minutesReward: 10 },
  { id: "focus_session_25", title: "Complete a 25-minute focus session", description: "Use the Reclaim timer for one uninterrupted 25-minute block.", minutesReward: 0 }, // the Focus screen itself awards this one's time
  { id: "phone_free_walk", title: "Take a 20-minute phone-free walk", description: "Leave it behind, or just leave it in your pocket, off.", minutesReward: 15 },
  { id: "no_screens_first_hour", title: "No screens in your first hour awake", description: "Let your morning start before your notifications do.", minutesReward: 15 },
  { id: "one_app_pause", title: "Skip your most-used app for the whole day", description: "One day off from the app you open on autopilot.", minutesReward: 20 },
];

// Simple deterministic hash so the same date always yields the same index.
function hashDate(dateIso) {
  let hash = 0;
  for (let i = 0; i < dateIso.length; i++) {
    hash = (hash * 31 + dateIso.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function challengeForDate(dateIso) {
  const idx = hashDate(dateIso) % CHALLENGE_POOL.length;
  return CHALLENGE_POOL[idx];
}

export function isChallengeCompleted(dateIso, challengeCompletions) {
  return challengeCompletions.some((c) => c.date === dateIso);
}

// Builds the record to append to challengeCompletions. Caller (state layer)
// is responsible for only calling this once per date — see
// AppStateContext.completeTodayChallenge, which checks isChallengeCompleted
// first to prevent duplicate rewards.
export function buildCompletionRecord(dateIso, challenge) {
  return {
    id: `${dateIso}:${challenge.id}`,
    date: dateIso,
    challengeId: challenge.id,
    minutes: challenge.minutesReward,
    xp: XP_RULES.challengeComplete,
    completedAt: new Date().toISOString(),
  };
}
