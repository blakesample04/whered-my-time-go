// AppStateContext.jsx
//
// Single source of truth for the whole app. Holds all persisted state,
// persists every slice to localStorage on change, and computes the
// "derived" numbers (time bank, streak, XP/level, achievements, today's
// challenge, weekly report, baseline, reminders) once per render via
// useMemo so every screen sees consistent, in-sync values instead of each
// screen recomputing its own version.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadValue, saveValue, resetAll } from "./storage";
import { DEFAULT_STATE, STORAGE_KEYS } from "./defaultState";
import { todayISO } from "../lib/dateUtils";
import {
  computeTimeBank,
  addTargetChange,
  targetForDate,
  totalUsageForDate,
  computeBaselineMinutesPerDay,
  EPOCH_DATE,
} from "../lib/reclaim";
import { computeStreak } from "../lib/streaks";
import { computeXpBreakdown, computeLevel } from "../lib/xp";
import { evaluateAchievements, buildAchievementContext, newlyUnlockedIds } from "../lib/achievements";
import { challengeForDate, isChallengeCompleted, buildCompletionRecord } from "../lib/challenges";
import { buildReflection } from "../lib/reflections";
import { buildWeeklyReport } from "../lib/weeklyReport";
import { getPendingReminders } from "../lib/notifications";
import { createGoal } from "../lib/goals";

const AppStateContext = createContext(null);

function loadAll() {
  const state = {};
  for (const [field, key] of Object.entries(STORAGE_KEYS)) {
    state[field] = loadValue(key, DEFAULT_STATE[field]);
  }
  return state;
}

export function AppStateProvider({ children }) {
  const [state, setState] = useState(loadAll);

  // Persist whichever slice changed. Cheap enough to just re-save everything
  // that's in STORAGE_KEYS on every state change given the app's data size.
  useEffect(() => {
    for (const [field, key] of Object.entries(STORAGE_KEYS)) {
      saveValue(key, state[field]);
    }
  }, [state]);

  const patch = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...(typeof partial === "function" ? partial(prev) : partial) }));
  }, []);

  // --- Derived values --------------------------------------------------------

  const nowIso = todayISO();

  const timeBank = useMemo(() => computeTimeBank(state, nowIso), [state, nowIso]);
  const streak = useMemo(() => computeStreak(state.usageLog, state.targetHistory, nowIso), [state.usageLog, state.targetHistory, nowIso]);
  const xpBreakdown = useMemo(() => computeXpBreakdown(state), [state]);
  const level = useMemo(() => computeLevel(xpBreakdown.total), [xpBreakdown]);

  const achievementCtx = useMemo(
    () => buildAchievementContext(state, timeBank, streak),
    [state, timeBank, streak]
  );
  const unlockedIds = useMemo(() => state.achievementsUnlocked.map((a) => a.id), [state.achievementsUnlocked]);
  const achievements = useMemo(
    () => evaluateAchievements(achievementCtx, unlockedIds),
    [achievementCtx, unlockedIds]
  );

  // Auto-unlock: whenever the derived context says something new qualifies,
  // record it (once) with a timestamp. This is the only place that writes
  // to achievementsUnlocked, so an achievement can never unlock twice.
  useEffect(() => {
    const fresh = newlyUnlockedIds(achievementCtx, unlockedIds);
    if (fresh.length > 0) {
      patch((prev) => ({
        achievementsUnlocked: [
          ...prev.achievementsUnlocked,
          ...fresh.map((id) => ({ id, unlockedAt: new Date().toISOString() })),
        ],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievementCtx.metDatesCount, achievementCtx.metWeekend, achievementCtx.timeBankAllTime, achievementCtx.timeBankWeek, achievementCtx.longestStreak, achievementCtx.routineChangeMinutes]);

  const todaysTarget = useMemo(() => targetForDate(state.targetHistory, nowIso), [state.targetHistory, nowIso]);
  const usageToday = useMemo(() => totalUsageForDate(nowIso, state.usageLog), [state.usageLog, nowIso]);
  const hasLoggedToday = useMemo(() => state.usageLog.some((u) => u.date === nowIso), [state.usageLog, nowIso]);

  const baselineMinutesPerDay = useMemo(
    () => computeBaselineMinutesPerDay(state.usageLog, state.onboardingEstimateMinutesPerDay),
    [state.usageLog, state.onboardingEstimateMinutesPerDay]
  );

  const todaysChallenge = useMemo(() => {
    const challenge = challengeForDate(nowIso);
    return { ...challenge, completed: isChallengeCompleted(nowIso, state.challengeCompletions) };
  }, [nowIso, state.challengeCompletions]);

  const weeklyReport = useMemo(() => buildWeeklyReport(state, nowIso), [state, nowIso]);

  const reminders = useMemo(
    () =>
      getPendingReminders(
        { notificationsEnabled: state.notificationsEnabled, todayIso: nowIso },
        { timeBank, usageToday, streak, challenge: todaysChallenge }
      ),
    [state.notificationsEnabled, nowIso, timeBank, usageToday, streak, todaysChallenge]
  );

  const derived = {
    nowIso,
    timeBank,
    streak,
    xpBreakdown,
    level,
    achievements,
    todaysTarget,
    usageToday,
    hasLoggedToday,
    baselineMinutesPerDay,
    todaysChallenge,
    weeklyReport,
    reminders,
    isFirstTimeUser: state.usageLog.length === 0,
  };

  // --- Actions --------------------------------------------------------

  const actions = useMemo(
    () => ({
      addUsageEntry(entry) {
        patch((prev) => ({ usageLog: [...prev.usageLog, entry] }));
      },

      importUsageEntries(entries) {
        if (entries.length === 0) return;
        patch((prev) => {
          const keySet = new Set(entries.map((e) => `${e.date}|${e.appName}`));
          const kept = prev.usageLog.filter((u) => !keySet.has(`${u.date}|${u.appName}`));
          return { usageLog: [...kept, ...entries] };
        });
      },

      setDailyTarget(minutesPerDay, effectiveDate = todayISO()) {
        patch((prev) => ({ targetHistory: addTargetChange(prev.targetHistory, effectiveDate, minutesPerDay) }));
      },

      addAppGoal({ appName, baselineMinutesPerDay: baseline, dailyLimitMinutes }) {
        const goal = createGoal({ appName, baselineMinutesPerDay: baseline, dailyLimitMinutes });
        patch((prev) => ({ appGoals: [...prev.appGoals, goal] }));
      },

      removeAppGoal(id) {
        patch((prev) => ({ appGoals: prev.appGoals.filter((g) => g.id !== id) }));
      },

      startFocusSession(durationMinutes) {
        const session = { id: `focus:${Date.now()}`, durationMinutes, startedAt: Date.now() };
        patch({ activeFocusSession: session });
        return session;
      },

      // Idempotent: only awards if an active session with this id still
      // exists. Once awarded, activeFocusSession is cleared, so calling
      // this again (e.g. a duplicate timer tick) is a no-op.
      completeActiveFocusSession() {
        setState((prev) => {
          const session = prev.activeFocusSession;
          if (!session) return prev;
          const elapsedMinutes = (Date.now() - session.startedAt) / 60000;
          const awardedMinutes = Math.max(
            1,
            Math.min(session.durationMinutes, Math.round(elapsedMinutes))
          );
          const record = {
            id: session.id,
            date: todayISO(),
            minutes: awardedMinutes,
            startedAt: session.startedAt,
            completedAt: Date.now(),
          };
          return {
            ...prev,
            focusSessions: [...prev.focusSessions, record],
            activeFocusSession: null,
          };
        });
      },

      cancelActiveFocusSession() {
        patch({ activeFocusSession: null });
      },

      completeTodayChallenge() {
        setState((prev) => {
          const dateIso = todayISO();
          if (isChallengeCompleted(dateIso, prev.challengeCompletions)) return prev; // no duplicate rewards
          const challenge = challengeForDate(dateIso);
          const record = buildCompletionRecord(dateIso, challenge);
          return { ...prev, challengeCompletions: [...prev.challengeCompletions, record] };
        });
      },

      addReflection(minutes, categoryId) {
        patch((prev) => ({
          reflections: [...prev.reflections, buildReflection(todayISO(), minutes, categoryId)],
        }));
      },

      setNotificationsEnabled(enabled) {
        patch({ notificationsEnabled: enabled });
      },

      toggleTimeBackGoal(id) {
        patch((prev) => ({
          timeBackGoals: prev.timeBackGoals.includes(id)
            ? prev.timeBackGoals.filter((g) => g !== id)
            : [...prev.timeBackGoals, id],
        }));
      },

      completeOnboarding({ estimateMinutesPerDay, timeBackGoals, dailyTargetMinutes }) {
        patch((prev) => ({
          onboardingComplete: true,
          onboardingEstimateMinutesPerDay: estimateMinutesPerDay,
          timeBackGoals,
          // Recorded at EPOCH_DATE, not today — see the comment on
          // EPOCH_DATE in lib/reclaim.js for why this matters.
          targetHistory: addTargetChange(prev.targetHistory, EPOCH_DATE, dailyTargetMinutes),
        }));
      },

      resetAllData() {
        resetAll(Object.values(STORAGE_KEYS));
        setState({ ...DEFAULT_STATE });
      },
    }),
    [patch]
  );

  const value = useMemo(() => ({ state, derived, actions }), [state, derived, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
