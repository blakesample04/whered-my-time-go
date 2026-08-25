import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useCelebration } from "../state/CelebrationContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { dailyReclaimedMinutes, trackedDates } from "../lib/reclaim";
import { addDays, parseISODate } from "../lib/dateUtils";
import { TIME_BACK_REASONS, reasonIcon } from "../state/defaultState";
import { templateStepsFor } from "../lib/goalTemplates";
import { isFeatureUnlocked } from "../lib/premium";
import ProgressBar from "../components/ProgressBar";
import ProgressRing from "../components/ProgressRing";
import AnimatedMinutes from "../components/AnimatedMinutes";
import ShareModal from "../components/ShareModal";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PremiumGate from "../components/PremiumGate";

const ACHIEVEMENT_ICONS = {
  first_step: "👣",
  weekend: "🌅",
  five_hours_back: "⏱",
  the_week: "📅",
  hundred_hours: "💯",
  changed_routine: "🔄",
  two_week_streak: "🔥",
};

export default function Progress() {
  const { state, derived, actions } = useAppState();
  const { celebrate } = useCelebration();
  const {
    timeBank, streak, level, achievements, nowIso, activeGoal, activeGoalProgress,
    activeGoalMinutesInvested, activeGoalMinutesThisWeek, activeGoalEstimatedCompletion,
    budgetToday, patterns,
  } = derived;
  const [shareOpen, setShareOpen] = useState(false);

  const [newStepText, setNewStepText] = useState("");
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState(null);
  const [newGoalWeeklyMinutes, setNewGoalWeeklyMinutes] = useState(180);
  const [goalLimitNotice, setGoalLimitNotice] = useState(false);

  const budgetUnlocked = isFeatureUnlocked("time_budget", state.isPremium);
  const patternsUnlocked = isFeatureUnlocked("patterns", state.isPremium);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const tracked = new Set(trackedDates(state.usageLog));
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(nowIso, i - 6));
  // Untracked days (no usage ever logged for them) show as empty, not as
  // full-target false credit — target-minus-zero would otherwise look like
  // a perfect day that never actually happened.
  const last7Values = last7.map((d) => (tracked.has(d) ? dailyReclaimedMinutes(d, state.usageLog, state.targetHistory) || 0 : 0));
  const maxVal = Math.max(1, ...last7Values);

  function toggleStep(stepId) {
    if (!activeGoal) return;
    const step = activeGoal.steps.find((s) => s.id === stepId);
    actions.toggleGoalStep(activeGoal.id, stepId);
    if (step && !step.done) celebrate({ icon: "✓", title: "Step complete", subtitle: step.text });
  }

  function addStep() {
    if (!activeGoal || !newStepText.trim()) return;
    actions.addGoalStep(activeGoal.id, newStepText);
    setNewStepText("");
  }

  function createGoal() {
    if (!newGoalTitle.trim() || !newGoalCategory) return;
    const result = actions.addGoal({
      title: newGoalTitle,
      category: newGoalCategory,
      initialSteps: templateStepsFor(newGoalCategory),
      weeklyTargetMinutes: newGoalWeeklyMinutes,
    });
    if (result === "blocked") {
      setGoalLimitNotice(true);
      return;
    }
    setNewGoalOpen(false);
    setNewGoalTitle("");
    setNewGoalCategory(null);
    setNewGoalWeeklyMinutes(180);
  }

  function openNewGoal() {
    setGoalLimitNotice(false);
    setNewGoalOpen(true);
  }

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Your Progress</h1>
        <p>Not perfection — intention. Here's where that's taken you.</p>
      </div>

      <section className="card">
        <h2>Your Goal{state.goals.length > 1 ? "s" : ""}</h2>

        {state.goals.length > 1 && (
          <div className="goal-switch-row">
            {state.goals.map((g) => (
              <button
                key={g.id}
                className={"goal-switch-chip" + (activeGoal && g.id === activeGoal.id ? " active" : "")}
                onClick={() => actions.setActiveGoal(g.id)}
              >
                {reasonIcon(g.category)} {g.title}
              </button>
            ))}
          </div>
        )}

        {activeGoal ? (
          <>
            <p className="sub">
              {activeGoalProgress.total === 0
                ? "No steps yet — add one below."
                : `${activeGoalProgress.done} of ${activeGoalProgress.total} steps complete`}
            </p>

            <div className="bank-grid" style={{ marginBottom: 16 }}>
              <div className="cell"><div className="k">Invested</div><div className="v">{formatHoursMinutes(activeGoalMinutesInvested)}</div></div>
              <div className="cell">
                <div className="k">This week</div>
                <div className="v">
                  {formatHoursMinutes(activeGoalMinutesThisWeek)}
                  {activeGoal.weeklyTargetMinutes ? ` / ${formatHoursMinutes(activeGoal.weeklyTargetMinutes)}` : ""}
                </div>
              </div>
              <div className="cell">
                <div className="k">Est. done</div>
                <div className="v" style={{ fontSize: 12.5 }}>{activeGoalEstimatedCompletion || "—"}</div>
              </div>
            </div>

            <div className="step-list">
              {activeGoal.steps.map((s) => (
                <div className={"step-row" + (s.done ? " done" : "")} key={s.id}>
                  <div className="step-row-left">
                    <button
                      className={"step-toggle" + (s.done ? " checked" : "")}
                      onClick={() => toggleStep(s.id)}
                      aria-label={s.done ? "Mark step not done" : "Mark step done"}
                    >
                      {s.done ? "✓" : ""}
                    </button>
                    <span className="step-text">{s.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Add a step"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStep()}
              />
              <button className="secondary" onClick={addStep}>Add</button>
            </div>
          </>
        ) : (
          <EmptyState icon="🎯" title="No goal set yet" body="Add something you're working toward, and break it into steps." />
        )}

        <button className="link" style={{ marginTop: 14 }} onClick={openNewGoal}>
          + Start a new goal
        </button>
      </section>

      <section className="card bank-hero">
        <div className="section-label">Time Bank</div>
        <AnimatedMinutes minutes={timeBank.allTime} as="div" className="value" />
        <p className="sub" style={{ textAlign: "center", marginTop: 4, marginBottom: 0 }}>
          fuel for {activeGoal ? `"${activeGoal.title}"` : "your goal"}
        </p>

        <div className="mini-bars" aria-hidden="true">
          {last7Values.map((v, i) => (
            <div
              key={i}
              className={"mini-bar" + (i === 6 ? " filled" : "")}
              style={{ height: `${Math.max(6, (v / maxVal) * 60)}px` }}
            />
          ))}
        </div>
        <div className="mini-bar-label">
          {last7.map((d, i) => <span key={d}>{i === 6 ? "Today" : parseISODate(d).toLocaleDateString(undefined, { weekday: "narrow" })}</span>)}
        </div>

        <div className="bank-grid">
          <div className="cell"><div className="k">Today</div><div className="v">{formatHoursMinutes(timeBank.today)}</div></div>
          <div className="cell"><div className="k">Week</div><div className="v">{formatHoursMinutes(timeBank.week)}</div></div>
          <div className="cell"><div className="k">Month</div><div className="v">{formatHoursMinutes(timeBank.month)}</div></div>
          <div className="cell"><div className="k">All time</div><div className="v">{formatHoursMinutes(timeBank.allTime)}</div></div>
        </div>

        <p className="sub" style={{ marginTop: 14, marginBottom: 12, textAlign: "center" }}>
          This never resets on a bad day — every minute you've reclaimed stays banked.
        </p>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setShareOpen(true)}>
          Share your progress
        </button>
      </section>

      <section className="card">
        <div className="level-row">
          <ProgressRing progress={level.progress} size={64} stroke={6} gradientId="levelRing" trackColor="var(--border)">
            <span className="num" style={{ fontSize: 18, color: "var(--text-h)" }}>{level.level}</span>
          </ProgressRing>
          <div className="level-info">
            <div className="level-title">{level.title}</div>
            <div className="level-xp-caption">{level.xpIntoLevel} / {level.xpForNext} XP · {level.totalXp} total</div>
            <ProgressBar progress={level.progress} />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-label" style={{ marginBottom: 10 }}>Streak</div>
        <div style={{ display: "flex", gap: 28 }}>
          <div className="streak-flame-row">
            <span className={"streak-flame-icon" + (streak.current === 0 ? " dim" : "")}>🔥</span>
            <span className="streak-value num">{streak.current}</span>
          </div>
          {streak.graceAvailable > 0 && (
            <div>
              <div className="section-label">Grace banked</div>
              <div className="streak-value num" style={{ fontSize: 22 }}>🛟 {streak.graceAvailable}</div>
            </div>
          )}
        </div>
        <div className="streak-longest" style={{ marginTop: 8 }}>Longest run: {streak.longest} days</div>
        <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
          {streak.current > 0
            ? `You've stayed under your target for ${streak.current} day${streak.current === 1 ? "" : "s"} straight.`
            : streak.longest > 0
            ? "Your run ended. Your progress didn't — your longest streak and everything you've reclaimed are still yours."
            : "Meet your target today to start your first run."}
        </p>
      </section>

      <PremiumGate unlocked={budgetUnlocked} label="Time budgeting — Premium">
        <section className="card">
          <h2>Today's Time Budget</h2>
          {!state.timeBudget ? (
            <EmptyState icon="🧮" title="No budget set up yet" body="Allocate your daily time across categories in Settings to see this." />
          ) : (
            budgetToday.map((row) => (
              <div className="budget-row" key={row.id}>
                <div className="budget-row-head">
                  <span className="name">{row.icon} {row.label}</span>
                  <span className={"stat" + (row.overBy > 0 ? " over" : "")}>
                    {row.overBy > 0
                      ? `+${formatHoursMinutes(row.overBy)} over`
                      : `${formatHoursMinutes(row.remaining)} left`}
                  </span>
                </div>
                <div className="budget-track">
                  <div
                    className={"budget-fill" + (row.overBy > 0 ? " over" : "")}
                    style={{ width: `${Math.min(100, row.budget ? (row.used / row.budget) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </section>
      </PremiumGate>

      <PremiumGate unlocked={patternsUnlocked} label="Personal patterns — Premium">
        <section className="card">
          <h2>Your Patterns</h2>
          {!patterns.hasEnoughData ? (
            <EmptyState icon="📈" title="Not enough data yet" body="Log a bit more usage and a few goal sessions, and patterns will show up here." />
          ) : (
            <div className="pattern-grid">
              <div className="pattern-tile"><div className="k">Best focus time</div><div className="v">{patterns.bestFocusWindow || "—"}</div></div>
              <div className="pattern-tile"><div className="k">Most productive day</div><div className="v">{patterns.mostProductiveDay || "—"}</div></div>
              <div className="pattern-tile"><div className="k">Most distracting day</div><div className="v">{patterns.mostDistractingDay || "—"}</div></div>
              <div className="pattern-tile"><div className="k">Avg. goal session</div><div className="v">{patterns.avgGoalSessionMinutes ? `${patterns.avgGoalSessionMinutes} min` : "—"}</div></div>
            </div>
          )}
        </section>
      </PremiumGate>

      <section className="card">
        <h2>Achievements</h2>
        <p className="sub">{unlockedCount} of {achievements.length} unlocked</p>
        <div className="achv-grid">
          {achievements.map((a) => (
            <div className={"achv-tile" + (a.unlocked ? " unlocked" : "")} key={a.id}>
              <span className="achv-icon">{ACHIEVEMENT_ICONS[a.id] || "★"}</span>
              <div className="achv-title">{a.title}</div>
              <div className="achv-desc">{a.description}</div>
              <div className="achv-state">{a.unlocked ? "Unlocked" : "Locked"}</div>
            </div>
          ))}
        </div>
      </section>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eyebrow="I reclaimed"
        big={formatHoursMinutes(timeBank.allTime)}
        sub="of my time, lifetime."
        stats={[
          { label: "Level", value: `${level.level} · ${level.title}` },
          { label: "Streak", value: `${streak.current}d` },
        ]}
        shareText={`I've reclaimed ${formatHoursMinutes(timeBank.allTime)} of screen time with Where'd my time go?`}
        filename="time-bank"
      />

      <Modal open={newGoalOpen} onClose={() => setNewGoalOpen(false)} title="New goal">
        {goalLimitNotice ? (
          <EmptyState
            icon="✦"
            title="One goal at a time on the free plan"
            body="Premium unlocks unlimited goals — you can enable a local test toggle for this in Settings while real billing isn't wired up yet."
            action={<Link to="/settings" className="link">See Settings</Link>}
          />
        ) : (
          <>
            <div className="form-row">
              <input
                type="text"
                placeholder="What do you want to work toward?"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="onboarding-goals" style={{ justifyContent: "flex-start", marginBottom: 16, marginTop: 4 }}>
              {TIME_BACK_REASONS.map((r) => (
                <button
                  key={r.id}
                  className={"chip-toggle" + (newGoalCategory === r.id ? " selected" : "")}
                  onClick={() => setNewGoalCategory(r.id)}
                >
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
            <div className="form-row">
              <input
                type="number"
                min="15"
                step="15"
                value={newGoalWeeklyMinutes}
                onChange={(e) => setNewGoalWeeklyMinutes(Number(e.target.value))}
                style={{ maxWidth: 100 }}
              />
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>minutes a week</span>
            </div>
            <button
              className="primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={!newGoalTitle.trim() || !newGoalCategory}
              onClick={createGoal}
            >
              Create goal
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
