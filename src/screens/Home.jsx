import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useCelebration } from "../state/CelebrationContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { dailyReclaimedMinutes } from "../lib/reclaim";
import { homeMessage } from "../lib/messages";
import ProgressRing from "../components/ProgressRing";
import ProgressBar from "../components/ProgressBar";
import AnimatedMinutes from "../components/AnimatedMinutes";
import ReflectionPrompt from "../components/ReflectionPrompt";

const REFLECTION_TRIGGER_MINUTES = 30;

export default function Home() {
  const { state, derived, actions } = useAppState();
  const { celebrate } = useCelebration();
  const { timeBank, streak, level, todaysTarget, hasLoggedToday, todaysChallenge, nowIso, reminders } = derived;

  const todayReclaimed = hasLoggedToday
    ? dailyReclaimedMinutes(nowIso, state.usageLog, state.targetHistory) || 0
    : 0;

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionDismissedForToday, setReflectionDismissedForToday] = useState(false);

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

  const ringProgress = todaysTarget ? Math.min(1, todayReclaimed / todaysTarget) : 0;

  function completeChallenge() {
    actions.completeTodayChallenge();
    if (todaysChallenge.minutesReward > 0) {
      celebrate({ icon: "🎯", title: "Challenge complete", subtitle: `+${todaysChallenge.minutesReward}m added to your Time Bank` });
    } else {
      celebrate({ icon: "🎯", title: "Challenge complete", subtitle: "Nice — that's today handled." });
    }
  }

  return (
    <div className="screen">
      <header className="top">
        <span className="wordmark">
          <span className="dot" aria-hidden="true" />
          Where'd my time go?
        </span>
      </header>

      <section className="hero-card">
        <div className="hero-top">
          <ProgressRing progress={ringProgress} size={176} stroke={13}>
            <div className="hero-ring-stack">
              <div className="hero-eyebrow">Time Reclaimed</div>
              <AnimatedMinutes minutes={timeBank.week} as="div" className="hero-value" />
            </div>
          </ProgressRing>
        </div>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          {hasLoggedToday && todayReclaimed > 0 && (
            <div className="hero-delta">+{formatHoursMinutes(todayReclaimed)} today</div>
          )}
          {todaysTarget != null && (
            <div className="hero-goal-label" style={{ marginTop: 6 }}>
              Goal · {formatHoursMinutes(todaysTarget)}/day
            </div>
          )}
        </div>

        <div className="hero-message">
          <div className="headline">{msg.headline}</div>
          {msg.sub && <div className="sub">{msg.sub}</div>}
          {!hasLoggedToday && (
            <Link to="/settings" className="link-cta primary" style={{ marginTop: 12, textDecoration: "none" }}>
              Log today's time
            </Link>
          )}
        </div>
      </section>

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
