import { useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { useCelebration } from "../state/CelebrationContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import ProgressRing from "../components/ProgressRing";

const PRESETS = [10, 25, 45];

function findStep(goal, stepId) {
  return goal?.steps.find((s) => s.id === stepId) || null;
}

export default function Focus() {
  const { state, derived, actions } = useAppState();
  const { celebrate } = useCelebration();
  const active = state.activeFocusSession;

  const [customMinutes, setCustomMinutes] = useState(15);
  const [justCompleted, setJustCompleted] = useState(null); // { minutes, stepCompletedText } | null
  const [tick, setTick] = useState(0);
  const completingRef = useRef(false);

  // What we'll attach the NEXT session to, if the user hasn't started one
  // yet — set by Home's "Start Goal Session" (or onboarding's finish CTA)
  // via actions.setPendingSessionContext before navigating here.
  const pendingGoal = derived.pendingSessionContext
    ? state.goals.find((g) => g.id === derived.pendingSessionContext.goalId)
    : null;
  const pendingStep = pendingGoal ? findStep(pendingGoal, derived.pendingSessionContext.stepId) : null;

  // Once a session is actually running, its own goalId/stepId (persisted
  // on activeFocusSession) is the source of truth — not the pending intent,
  // which may have already been superseded.
  const activeGoal = active?.goalId ? state.goals.find((g) => g.id === active.goalId) : null;
  const activeStep = activeGoal ? findStep(activeGoal, active.stepId) : null;

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const remainingMs = active
    ? Math.max(0, active.durationMinutes * 60000 - (Date.now() - active.startedAt))
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = active ? 1 - remainingMs / (active.durationMinutes * 60000) : 0;

  useEffect(() => {
    if (active && remainingMs <= 0 && !completingRef.current) {
      completingRef.current = true;
      const minutes = active.durationMinutes;
      const result = actions.completeActiveFocusSession();
      setJustCompleted({ minutes, stepCompletedText: result?.stepCompletedText || null });
      if (result?.stepCompletedText) {
        celebrate({ icon: "✓", title: "Step complete", subtitle: result.stepCompletedText });
      } else {
        celebrate({ icon: "⏳", title: `${formatHoursMinutes(minutes)} reclaimed`, subtitle: "Straight into your Time Bank." });
      }
    }
    if (!active) completingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, active, remainingMs]);

  function start(minutes) {
    setJustCompleted(null);
    const ctx = pendingGoal && pendingStep ? { goalId: pendingGoal.id, stepId: pendingStep.id } : null;
    actions.startFocusSession(minutes, ctx);
    actions.clearPendingSessionContext();
  }

  function mm(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="screen focus-screen">
      <div className="screen-title">
        <h1>Reclaim Time</h1>
        <p>A focused block, phone-free — added straight to your Time Bank when it's done.</p>
      </div>

      <div className="focus-body">
      {justCompleted != null && !active && (
        <section className="card reclaim-result">
          <div className="icon" aria-hidden="true">✓</div>
          <div className="amount num">{formatHoursMinutes(justCompleted.minutes)} reclaimed</div>
          <p className="sub" style={{ marginBottom: 0, marginTop: 4 }}>
            {justCompleted.stepCompletedText
              ? `"${justCompleted.stepCompletedText}" is done. It's in your Time Bank too.`
              : "Nice work. It's in your Time Bank now."}
          </p>
        </section>
      )}

      <section className="card timer-stage">
        {active ? (
          <>
            {activeGoal && (
              <div className="session-goal-badge">
                <div className="k">Working on</div>
                <div className="v">{activeGoal.title}{activeStep ? ` — ${activeStep.text}` : ""}</div>
              </div>
            )}
            <ProgressRing progress={progress} size={230} stroke={14} gradientId="focusRing">
              <span className="timer-time num">{mm(remainingSeconds)}</span>
            </ProgressRing>
            <p className="timer-caption">Reclaiming {active.durationMinutes} minutes — phone down, timer's got it.</p>
            <button className="secondary" onClick={() => actions.cancelActiveFocusSession()}>
              Cancel session
            </button>
          </>
        ) : (
          <>
            {pendingGoal && pendingStep && (
              <div className="session-goal-badge">
                <div className="k">Starting a goal session</div>
                <div className="v">{pendingGoal.title} — {pendingStep.text}</div>
              </div>
            )}
            <p className="sub" style={{ marginBottom: 16 }}>Choose a length:</p>
            <div className="duration-picker">
              {PRESETS.map((m) => (
                <button key={m} className="primary" onClick={() => start(m)}>
                  {m}<span style={{ fontSize: 11, fontWeight: 600, display: "block", opacity: 0.85 }}>min</span>
                </button>
              ))}
            </div>
            <div className="form-row" style={{ justifyContent: "center", marginTop: 16, width: "100%" }}>
              <input
                type="number"
                min="1"
                max="240"
                aria-label="Custom session length in minutes"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                style={{ maxWidth: 90, textAlign: "center", flex: "0 1 90px" }}
              />
              <button className="secondary" onClick={() => start(Math.max(1, customMinutes))}>
                Custom length
              </button>
            </div>
          </>
        )}
      </section>
      </div>
    </div>
  );
}
