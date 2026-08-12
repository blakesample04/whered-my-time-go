// goals.js
//
// "Time recovered" logic: instead of just tracking whether someone stayed
// under a limit, we compare actual usage against what they say they *used
// to* spend (the baseline), and bank the difference as time given back.
// Also plain JS, no UI/platform code, for the same reuse reason as
// timeTranslator.js.

// usageLog entries look like: { date: 'YYYY-MM-DD', appName, minutes }

export function createGoal({ appName, baselineMinutesPerDay, dailyLimitMinutes }) {
  return {
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    appName,
    baselineMinutesPerDay,
    dailyLimitMinutes,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function totalMinutesForApp(appName, usageLog) {
  return usageLog
    .filter((u) => u.appName === appName)
    .reduce((sum, u) => sum + u.minutes, 0);
}

// Recovered time for a logged day = however much LESS than the old baseline
// they actually spent that day. Never negative (a bad day doesn't erase
// previously recovered time). Days with no log entry don't count either way.
export function computeRecoveredMinutes(goal, usageLog) {
  const daysForApp = usageLog.filter((u) => u.appName === goal.appName);
  return daysForApp.reduce((total, day) => {
    const recoveredToday = Math.max(0, goal.baselineMinutesPerDay - day.minutes);
    return total + recoveredToday;
  }, 0);
}

export function loggedDayCount(goal, usageLog) {
  return usageLog.filter((u) => u.appName === goal.appName).length;
}

export function isOverGoalToday(goal, usageLog, today) {
  const entry = usageLog.find((u) => u.appName === goal.appName && u.date === today);
  if (!entry) return false;
  return entry.minutes > goal.dailyLimitMinutes;
}
