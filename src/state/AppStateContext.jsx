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
import { createGoal as createAppGoal } from "../lib/goals";
import {
  createGoal,
  createStep,
  goalProgress,
  nextStep,
  activeGoalOf,
  goalMinutesInvested,
  goalMinutesThisWeek,
  estimateCompletionDate,
} from "../lib/purpose";
import { usageByCategoryForDate, discretionaryRemaining, budgetComparison, todaysPriorities, categoryMinutesForDate } from "../lib/budget";
import { computePatterns, avgGoalSessionMinutes } from "../lib/patterns";
import { computeRecoveryPlan } from "../lib/recovery";
import { suggestInstead } from "../lib/instead";
import { FREE_GOAL_LIMIT } from "../lib/premium";
import { addDays } from "../lib/dateUtils";

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
  // Transient only — NOT in STORAGE_KEYS/persisted. This is just "what the
  // user clicked before navigating to Focus," e.g. Home's "Start Goal
  // Session" button, so Focus can pre-attach the session to that goal step.
  // It's fine for this to reset on reload; it's navigation intent, not data.
  const [pendingSessionContext, setPendingSessionContext] = useState(null);

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

  const activeGoal = useMemo(() => activeGoalOf(state.goals), [state.goals]);
  const activeGoalProgress = useMemo(() => goalProgress(activeGoal), [activeGoal]);
  const activeGoalNextStep = useMemo(() => nextStep(activeGoal), [activeGoal]);
  const activeGoalMinutesInvested = useMemo(() => goalMinutesInvested(activeGoal, state.focusSessions), [activeGoal, state.focusSessions]);
  const activeGoalMinutesThisWeek = useMemo(
    () => goalMinutesThisWeek(activeGoal, state.focusSessions, nowIso),
    [activeGoal, state.focusSessions, nowIso]
  );
  const activeGoalEstimatedCompletion = useMemo(
    () => estimateCompletionDate(activeGoal, state.focusSessions, nowIso),
    [activeGoal, state.focusSessions, nowIso]
  );
  const activeGoalRecoveryPlan = useMemo(
    () => computeRecoveryPlan(activeGoal, state.focusSessions, nowIso),
    [activeGoal, state.focusSessions, nowIso]
  );

  // --- time budget --------------------------------------------------------

  const usageByCategoryToday = useMemo(() => usageByCategoryForDate(nowIso, state), [nowIso, state]);
  const discretionaryRemainingToday = useMemo(
    () => discretionaryRemaining(state.timeBudget, usageByCategoryToday),
    [state.timeBudget, usageByCategoryToday]
  );
  const budgetToday = useMemo(
    () => (state.timeBudget ? budgetComparison(state.timeBudget, usageByCategoryToday) : []),
    [state.timeBudget, usageByCategoryToday]
  );
  const priorities = useMemo(
    () => todaysPriorities(state.timeBudget, usageByCategoryToday),
    [state.timeBudget, usageByCategoryToday]
  );

  const patterns = useMemo(() => computePatterns(state), [state]);

  const yesterdayEntertainmentMinutes = useMemo(
    () => categoryMinutesForDate("entertainment", addDays(nowIso, -1), state),
    [nowIso, state]
  );
  const insteadSuggestions = useMemo(
    () =>
      suggestInstead(yesterdayEntertainmentMinutes, {
        activeGoal,
        avgGoalSessionMinutes: avgGoalSessionMinutes(state.focusSessions),
      }),
    [yesterdayEntertainmentMinutes, activeGoal, state.focusSessions]
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
    activeGoal,
    activeGoalProgress,
    activeGoalNextStep,
    activeGoalMinutesInvested,
    activeGoalMinutesThisWeek,
    activeGoalEstimatedCompletion,
    activeGoalRecoveryPlan,
    usageByCategoryToday,
    discretionaryRemainingToday,
    budgetToday,
    priorities,
    patterns,
    yesterdayEntertainmentMinutes,
    insteadSuggestions,
    pendingSessionContext,
    isFirstTimeUser: state.usageLog.length === 0,
  };

  // --- Actions --------------------------------------------------------

  const actions = useMemo(
    () => ({
      // Rejects anything that isn't a real, sane, positive usage record —
      // matches the same rules lib/csvImport.js already applies to imported
      // rows, so a bad manual entry (empty app name, negative/NaN/zero
      // minutes) can't slip in and corrupt every downstream sum (time bank,
      // streaks, XP, budget, weekly report all assume finite non-negative
      // minutes).
      addUsageEntry(entry) {
        const minutes = Number(entry?.minutes);
        if (!entry?.date || !entry?.appName || !Number.isFinite(minutes) || minutes <= 0) return;
        patch((prev) => ({ usageLog: [...prev.usageLog, { ...entry, minutes }] }));
      },

      importUsageEntries(entries) {
        if (entries.length === 0) return;
        patch((prev) => {
          // Merge duplicate date+appName rows WITHIN the incoming batch
          // itself (e.g. a CSV export that lists the same app/day twice)
          // before merging into usageLog — otherwise each duplicate row
          // survives as its own additive entry and usage gets double (or
          // triple-, quadruple-...) counted instead of deduped.
          const merged = new Map();
          for (const e of entries) {
            const key = `${e.date}|${e.appName}`;
            const existing = merged.get(key);
            merged.set(key, existing ? { ...existing, minutes: existing.minutes + e.minutes } : e);
          }
          const keySet = new Set(merged.keys());
          const kept = prev.usageLog.filter((u) => !keySet.has(`${u.date}|${u.appName}`));
          return { usageLog: [...kept, ...merged.values()] };
        });
      },

      setDailyTarget(minutesPerDay, effectiveDate = todayISO()) {
        patch((prev) => ({ targetHistory: addTargetChange(prev.targetHistory, effectiveDate, minutesPerDay) }));
      },

      addAppGoal({ appName, baselineMinutesPerDay: baseline, dailyLimitMinutes }) {
        const goal = createAppGoal({ appName, baselineMinutesPerDay: baseline, dailyLimitMinutes });
        patch((prev) => ({ appGoals: [...prev.appGoals, goal] }));
      },

      removeAppGoal(id) {
        patch((prev) => ({ appGoals: prev.appGoals.filter((g) => g.id !== id) }));
      },

      // --- purpose goals ("what you're working toward") ---

      // Returns the created goal, or the string "blocked" if the free-tier
      // goal limit stopped it (see lib/premium.js for FREE_GOAL_LIMIT).
      addGoal({ title, category, why, initialSteps = [], weeklyTargetMinutes, targetDate }) {
        if (!title || !title.trim()) return null;
        let created = null;
        let blocked = false;
        patch((prev) => {
          if (prev.goals.length >= FREE_GOAL_LIMIT && !prev.isPremium) {
            blocked = true;
            return {};
          }
          created = createGoal({ title, category, why, isActive: prev.goals.length === 0, weeklyTargetMinutes, targetDate });
          created.steps = initialSteps.filter((s) => s && s.trim()).map((s) => createStep(s));
          return { goals: [...prev.goals, created] };
        });
        return blocked ? "blocked" : created;
      },

      addGoalStep(goalId, text) {
        if (!text || !text.trim()) return;
        patch((prev) => ({
          goals: prev.goals.map((g) => (g.id === goalId ? { ...g, steps: [...g.steps, createStep(text)] } : g)),
        }));
      },

      toggleGoalStep(goalId, stepId) {
        patch((prev) => ({
          goals: prev.goals.map((g) =>
            g.id !== goalId
              ? g
              : {
                  ...g,
                  steps: g.steps.map((s) =>
                    s.id === stepId ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s
                  ),
                }
          ),
        }));
      },

      setActiveGoal(goalId) {
        patch((prev) => ({
          goals: prev.goals.map((g) => ({ ...g, active: g.id === goalId })),
        }));
      },

      removeGoal(goalId) {
        patch((prev) => {
          const remaining = prev.goals.filter((g) => g.id !== goalId);
          const removedWasActive = prev.goals.find((g) => g.id === goalId)?.active;
          if (removedWasActive && remaining.length > 0 && !remaining.some((g) => g.active)) {
            remaining[0] = { ...remaining[0], active: true };
          }
          return { goals: remaining };
        });
      },

      // context: optional { goalId, stepId } — when present, the session
      // is "working on" a specific goal step (Home's "Start Goal Session"
      // and Focus's goal-linked flow both pass this). Plain focus sessions
      // from Focus's own duration picker omit it entirely.
      startFocusSession(durationMinutes, context = null) {
        const session = {
          id: `focus:${Date.now()}`,
          durationMinutes,
          startedAt: Date.now(),
          goalId: context?.goalId || null,
          stepId: context?.stepId || null,
        };
        patch({ activeFocusSession: session });
        return session;
      },

      // Idempotent: only awards if an active session with this id still
      // exists. Once awarded, activeFocusSession is cleared, so calling
      // this again (e.g. a duplicate timer tick) is a no-op. If the session
      // was tied to a goal step, that step is marked done in the same
      // update — this is the literal time → action → goal-progress link
      // the whole Goal Session feature exists for.
      completeActiveFocusSession() {
        let result = null;
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
            goalId: session.goalId || null,
            stepId: session.stepId || null,
          };

          let goals = prev.goals;
          let stepCompletedText = null;
          if (session.goalId && session.stepId) {
            goals = prev.goals.map((g) => {
              if (g.id !== session.goalId) return g;
              return {
                ...g,
                steps: g.steps.map((s) => {
                  if (s.id !== session.stepId) return s;
                  if (!s.done) stepCompletedText = s.text;
                  return { ...s, done: true, doneAt: new Date().toISOString() };
                }),
              };
            });
          }

          result = { awardedMinutes, stepCompletedText };
          return {
            ...prev,
            goals,
            focusSessions: [...prev.focusSessions, record],
            activeFocusSession: null,
          };
        });
        return result;
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

      // Returns the newly created goal (or null), so the caller can e.g.
      // immediately start a goal session on its first step.
      completeOnboarding({ estimateMinutesPerDay, timeBackGoals, dailyTargetMinutes, goal }) {
        let createdGoal = null;
        patch((prev) => {
          const goals = [...prev.goals];
          if (goal && goal.title && goal.title.trim()) {
            const created = createGoal({
              title: goal.title,
              category: goal.category,
              why: goal.why,
              isActive: true,
              weeklyTargetMinutes: goal.weeklyTargetMinutes,
              targetDate: goal.targetDate,
            });
            created.steps = (goal.steps || []).filter((s) => s && s.trim()).map((s) => createStep(s));
            goals.push(created);
            createdGoal = created;
          }
          return {
            onboardingComplete: true,
            onboardingEstimateMinutesPerDay: estimateMinutesPerDay,
            timeBackGoals,
            goals,
            // Recorded at EPOCH_DATE, not today — see the comment on
            // EPOCH_DATE in lib/reclaim.js for why this matters.
            targetHistory: addTargetChange(prev.targetHistory, EPOCH_DATE, dailyTargetMinutes),
          };
        });
        return createdGoal;
      },

      // --- time budget ---

      setTimeBudget(nextBudget) {
        patch({ timeBudget: nextBudget });
      },

      setAppCategory(appName, categoryId) {
        patch((prev) => ({ appCategories: { ...prev.appCategories, [appName]: categoryId } }));
      },

      // --- premium (real Stripe subscription — see lib/billing.js) ---

      // Called after a subscription is verified (right after Stripe
      // Checkout, or when the user re-enters their subscriber email on a
      // new device) via lib/billing.js's checkSubscription(). Never called
      // with active:true except in response to a verified server response —
      // see Settings.jsx and CheckoutSuccess.jsx.
      setPremiumStatus(email, active) {
        patch({ isPremium: active, premiumEmail: active ? email.trim().toLowerCase() : null });
      },

      // --- recovery plan ---

      acceptRecoveryPlan(plan) {
        patch({ recoveryPlan: { ...plan, acceptedAt: new Date().toISOString() } });
      },

      dismissRecoveryPlan() {
        patch({ recoveryPlan: null });
      },

      resetAllData() {
        resetAll(Object.values(STORAGE_KEYS));
        setState({ ...DEFAULT_STATE });
      },

      setPendingSessionContext(ctx) {
        setPendingSessionContext(ctx);
      },
      clearPendingSessionContext() {
        setPendingSessionContext(null);
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
