import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { dailyReclaimedMinutes } from "../lib/reclaim";
import { homeMessage } from "../lib/messages";
import ProgressBar from "../components/ProgressBar";
import ReflectionPrompt from "../components/ReflectionPrompt";

const REFLECTION_TRIGGER_MINUTES = 30;

export default function Home() {
  const { state, derived, actions } = useAppState();
  const { timeBank, streak, level, todaysTarget, usageToday, hasLoggedToday, todaysChallenge, nowIso, reminders } = derived;

  // Only a real, logged day earns a reclaimed figure — with nothing logged
  // yet today, target-minus-zero would otherwise read as "reclaimed the
  // whole target" before the user has done anything, which is misleading.
  const todayReclaimed = hasLoggedToday
    ? dailyReclaimedMinutes(nowIso, state.usageLog, state.targetHistory) || 0
    : 0;

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionDismissedForToday, setReflectionDismissedForToday] = useState(false);

  const alreadyReflectedToday = state.reflections.some((r) => r.date === nowIso);

  useEffect(() => {
    if (
      todayReclaimed >= REFLECTION_TRIGGER_MINUTES &&
      !alreadyReflectedToday &&
      !reflectionDismissedForToday
    ) {
      setReflectionOpen(true);
    }
  }, [todayReclaimed, alreadyReflectedToday, reflectionDismissedForToday]);

  const msg = homeMessage({
    hasLoggedToday,
    reclaimedToday: todayReclaimed,
    usageToday,
    target: todaysTarget,
    weekReclaimed: timeBank.week,
    streak,
  });

  return (
    <div className="screen">
      <header className="top">
        <h1>Recoup</h1>
      </header>

      <section className="card hero-metric">
        <div className="label">Time Reclaimed</div>
        <div className="value">{formatHoursMinutes(timeBank.week)}</div>
        <div style={{ fontSize: 12, color: "var(--text)" }}>so far this week</div>

        <div className="stat-row">
          <div className="stat">
            <div className="k">Today</div>
            <div className="v">{formatHoursMinutes(usageToday)}</div>
            <div style={{ fontSize: 11, color: "var(--text)" }}>screen time</div>
          </div>
          <div className="stat">
            <div className="k">Daily target</div>
            <div className="v">{todaysTarget != null ? formatHoursMinutes(todaysTarget) : "—"}</div>
          </div>
          <div className="stat">
            <div className="k">Difference</div>
            <div className="v" style={{ color: todayReclaimed > 0 ? "var(--good)" : "var(--text-h)" }}>
              {todaysTarget == null || !hasLoggedToday
                ? "—"
                : todayReclaimed > 0
                ? `${formatHoursMinutes(todayReclaimed)} reclaimed`
                : "0m"}
            </div>
          </div>
        </div>

        <div className="hero-message">
          <div className="headline">{msg.headline}</div>
          {msg.sub && <div className="sub" style={{ marginBottom: 0 }}>{msg.sub}</div>}
        </div>
      </section>

      {!hasLoggedToday && (
        <section className="card">
          <h2>Log today's screen time</h2>
          <p className="sub">Recoup needs today's usage to calculate what you've reclaimed.</p>
          <Link to="/settings" className="primary" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, textDecoration: "none" }}>
            Log usage
          </Link>
        </section>
      )}

      <section className="card">
        <div className="level-row">
          <span className="title">Lv. {level.level} — {level.title}</span>
          <span className="xp">{level.xpIntoLevel} / {level.xpForNext} XP</span>
        </div>
        <ProgressBar progress={level.progress} />
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="streak-badge">
            <span>🔥</span>
            <span>{streak.current} DAY RUN</span>
          </div>
          <Link to="/progress" className="link" style={{ fontSize: 13 }}>Details →</Link>
        </div>
        <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
          {streak.current > 0
            ? `You've stayed under your target for ${streak.current} day${streak.current === 1 ? "" : "s"}.`
            : streak.longest > 0
            ? "Your run ended. Your progress didn't."
            : "Meet your target today to start a run."}
        </p>
      </section>

      <section className="card challenge-card">
        <div className="k">Today's Challenge</div>
        <h3>{todaysChallenge.title}</h3>
        <p className="sub" style={{ marginBottom: 12 }}>{todaysChallenge.description}</p>
        {todaysChallenge.completed ? (
          <span className="chip">✓ Completed today</span>
        ) : (
          <button className="primary" onClick={() => actions.completeTodayChallenge()}>
            Mark as done
          </button>
        )}
      </section>

      <section className="card">
        <h2>Reclaim some time now</h2>
        <p className="sub">Start a focus session — it's added straight to your Time Bank.</p>
        <Link to="/focus" className="primary" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, textDecoration: "none" }}>
          Start a session
        </Link>
      </section>

      {reminders.length > 0 && (
        <section className="card">
          <h2>Reminders</h2>
          {reminders.map((r) => (
            <div className="reminder-item" key={r.id}>
              <div className="title">{r.title}</div>
              <div className="body">{r.body}</div>
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
