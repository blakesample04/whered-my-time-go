import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useCelebration } from "../state/CelebrationContext";
import { dailyReclaimedMinutes } from "../lib/reclaim";
import { homeMessage } from "../lib/messages";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { reasonIcon } from "../state/defaultState";
import { isFeatureUnlocked } from "../lib/premium";
import ProgressRing from "../components/ProgressRing";
import ProgressBar from "../components/ProgressBar";
import AnimatedMinutes from "../components/AnimatedMinutes";
import ReflectionPrompt from "../components/ReflectionPrompt";
import EmptyState from "../components/EmptyState";
import PremiumGate from "../components/PremiumGate";

const REFLECTION_TRIGGER_MINUTES = 30;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

export default function Home() {
  const { state, derived, actions } = useAppState();
  const { celebrate } = useCelebration();
  const navigate = useNavigate();
  const {
    timeBank, streak, level, todaysTarget, hasLoggedToday, todaysChallenge, nowIso, reminders,
    activeGoal, activeGoalProgress, activeGoalNextStep,
    discretionaryRemainingToday, priorities, yesterdayEntertainmentMinutes, insteadSuggestions,
  } = derived;

  const todayReclaimed = hasLoggedToday
    ? dailyReclaimedMinutes(nowIso, state.usageLog, state.targetHistory) || 0
    : 0;

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionDismissedForToday, setReflectionDismissedForToday] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const alreadyReflectedToday = state.reflections.some((r) => r.date === nowIso);

  useEffect(() => {
    if (todayReclaimed >= REFLECTION_TRIGGER_MINUTES && !alreadyReflectedToday && !reflectionDismissedForToday) {
      setReflectionOpen(true);
    }
  }, [todayReclaimed, alreadyReflectedToday, reflectionDismissedForToday]);

  const msg = homeMessage({
    hasLoggedToday,
    reclaimedToday: todayReclaimed,
    usageToday: derived.usageToday,
    target: todaysTarget,
    weekReclaimed: timeBank.week,
    streak,
  });

  function completeChallenge() {
    actions.completeTodayChallenge();
    if (todaysChallenge.minutesReward > 0) {
      celebrate({ icon: "🎯", title: "Challenge complete", subtitle: `+${todaysChallenge.minutesReward}m added to your Time Bank` });
    } else {
      celebrate({ icon: "🎯", title: "Challenge complete", subtitle: "Nice — that's today handled." });
    }
  }

  function completeNextStep() {
    if (!activeGoal || !activeGoalNextStep) return;
    actions.toggleGoalStep(activeGoal.id, activeGoalNextStep.id);
    celebrate({ icon: "✓", title: "Step complete", subtitle: activeGoalNextStep.text });
  }

  function startGoalSession() {
    if (!activeGoal || !activeGoalNextStep) return;
    actions.setPendingSessionContext({ goalId: activeGoal.id, stepId: activeGoalNextStep.id });
    navigate("/focus");
  }

  // Gentle accountability, folded together with "Recover My Time": only
  // shown when there's an actual next step, nobody's worked on this goal
  // yet today, and it hasn't been dismissed this visit. Never punitive —
  // "haven't started" reads as a fact, not a failure, and dismissing just
  // moves on rather than nagging again.
  const workedOnGoalToday = activeGoal
    ? state.focusSessions.some((s) => s.date === nowIso && s.goalId === activeGoal.id)
    : false;
  const showNudge = activeGoal && activeGoalNextStep && !workedOnGoalToday && !nudgeDismissed;

  const insteadUnlocked = isFeatureUnlocked("instead", state.isPremium);

  return (
    <div className="screen">
      <header className="top">
        <span className="wordmark">
          <span className="dot" aria-hidden="true" />
          Where'd my time go?
        </span>
      </header>

      <p className="greeting">{greeting()}</p>

      {showNudge && (
        <div className="accountability-card">
          <div className="text">
            {discretionaryRemainingToday > 0
              ? `You have ${formatHoursMinutes(discretionaryRemainingToday)} left today. "${activeGoal.title}" hasn't had a session yet — want to use some of it?`
              : `You planned to work on "${activeGoal.title}" today — no session yet.`}
          </div>
          <div className="accountability-actions">
            <button className="secondary" onClick={() => setNudgeDismissed(true)}>Tomorrow</button>
            <button className="primary" onClick={startGoalSession}>Start now</button>
          </div>
        </div>
      )}

      {state.timeBudget && (
        <section className="card discretionary-hero">
          <div className="section-label">Today's discretionary time</div>
          <div className="value num">{formatHoursMinutes(discretionaryRemainingToday)}</div>
          <div className="caption">left to spend how you choose</div>
          {priorities.length > 0 && (
            <div className="priorities-list">
              {priorities.map((p) => (
                <div className="priority-row" key={p.id}>
                  <span className="name">{p.icon} {p.label}</span>
                  <span className="amount">{formatHoursMinutes(p.remaining)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="goal-hero">
        {activeGoal ? (
          <>
            <div className="goal-hero-eyebrow">
              <span aria-hidden="true">{reasonIcon(activeGoal.category)}</span> Your Goal
            </div>
            <div className="goal-hero-title">{activeGoal.title}</div>

            <div className="goal-progress-wrap">
              <ProgressRing progress={activeGoalProgress.fraction} size={140} stroke={11} gradientId="goalRing">
                <span className="num" style={{ fontSize: 20, color: "var(--text-h)" }}>
                  {activeGoalProgress.done}/{activeGoalProgress.total || 0}
                </span>
              </ProgressRing>
            </div>
            <div className="goal-progress-caption">
              {activeGoalProgress.total === 0
                ? "No steps yet — add some on the Progress tab"
                : activeGoalNextStep
                ? `${activeGoalProgress.done} of ${activeGoalProgress.total} steps complete`
                : "All steps complete 🎉"}
            </div>

            {activeGoalNextStep && (
              <div className="goal-next-step">
                <button className="goal-step-check" onClick={completeNextStep} aria-label="Mark this step complete">✓</button>
                <div style={{ flex: 1 }}>
                  <div className="label">Next step</div>
                  <div className="text">{activeGoalNextStep.text}</div>
                  <button className="link" style={{ marginTop: 6, fontSize: 12.5 }} onClick={startGoalSession}>
                    Start Goal Session →
                  </button>
                </div>
              </div>
            )}
            {!activeGoalNextStep && activeGoalProgress.total > 0 && (
              <div className="goal-next-step">
                <div className="text">Add another step on the Progress tab, or start a new goal.</div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="🎯"
            title="Set a goal to get started"
            body="This app works best when it's helping you get somewhere specific — add one on the Progress tab."
            action={
              <Link to="/progress" className="primary" style={{ display: "inline-block", padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
                Set a goal
              </Link>
            }
          />
        )}
      </section>

      <div className="fuel-strip">
        🔋 <AnimatedMinutes minutes={timeBank.today} /> reclaimed today · <AnimatedMinutes minutes={timeBank.week} /> this week
      </div>

      {(hasLoggedToday || msg) && (
        <section className="card">
          <div className="hero-message" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <div className="headline">{msg.headline}</div>
            {msg.sub && <div className="sub">{msg.sub}</div>}
            {!hasLoggedToday && (
              <Link to="/settings" className="link-cta primary" style={{ marginTop: 12, textDecoration: "none" }}>
                Log today's time
              </Link>
            )}
          </div>
        </section>
      )}

      {yesterdayEntertainmentMinutes >= 10 && (
        <PremiumGate unlocked={insteadUnlocked} label="See what that time could become — Premium">
          <section className="card">
            <h2>What could you have done instead?</h2>
            <p className="sub">
              You spent {formatHoursMinutes(yesterdayEntertainmentMinutes)} on entertainment yesterday. With that time, you could have...
            </p>
            <ul className="instead-list">
              {insteadSuggestions.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>
        </PremiumGate>
      )}

      <section className="card">
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="streak-flame-row">
              <span className={"streak-flame-icon" + (streak.current === 0 ? " dim" : "")}>🔥</span>
              <span className="streak-value num">{streak.current}</span>
              <span className="streak-unit">day{streak.current === 1 ? "" : "s"}</span>
            </div>
            <div className="streak-longest">Best: {streak.longest} days</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ flex: 1 }}>
            <div className="level-title">Lv. {level.level} · {level.title}</div>
            <div className="level-xp-caption">{level.xpIntoLevel} / {level.xpForNext} XP</div>
            <ProgressBar progress={level.progress} />
          </div>
        </div>
      </section>

      <section className="challenge-card">
        <div className="challenge-eyebrow">Today's Challenge</div>
        <h3>{todaysChallenge.title}</h3>
        <p className="sub">{todaysChallenge.description}</p>
        {todaysChallenge.completed ? (
          <span className="challenge-done-badge">✓ Done for today</span>
        ) : (
          <button className="primary" onClick={completeChallenge}>Mark as done</button>
        )}
      </section>

      <Link to="/focus" className="primary btn-lg" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", marginBottom: 16 }}>
        <span aria-hidden="true">◎</span> Reclaim time now
      </Link>

      {reminders.length > 0 && (
        <section className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Reminders</div>
          {reminders.map((r) => (
            <div className="reminder-item" key={r.id}>
              <span className="dot" aria-hidden="true" />
              <div>
                <div className="title">{r.title}</div>
                <div className="body">{r.body}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <ReflectionPrompt
        open={reflectionOpen}
        minutes={todayReclaimed}
        onClose={() => {
          setReflectionOpen(false);
          setReflectionDismissedForToday(true);
        }}
        onPick={(categoryId) => actions.addReflection(todayReclaimed, categoryId)}
      />
    </div>
  );
}
