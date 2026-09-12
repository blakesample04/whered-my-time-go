import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { TIME_BACK_REASONS } from "../state/defaultState";
import { projectAnnualHours } from "../lib/reclaim";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { templateStepsFor } from "../lib/goalTemplates";
import { loadValue, saveValue } from "../state/storage";

const STEP_COUNT = 8;

// Onboarding asks for real, considered input (a goal, a weekly target...),
// and on Android there's always a chance of getting interrupted mid-flow —
// a call, a notification, the OS reclaiming a backgrounded tab — and coming
// back to find the app restarted from scratch. Without this, that silently
// threw away everything typed so far and dropped the user back to step 0
// with no explanation, which reads as broken rather than interrupted.
const DRAFT_KEY = "onboardingDraft";

export default function Onboarding() {
  const { actions } = useAppState();
  const navigate = useNavigate();
  const [draft] = useState(() => loadValue(DRAFT_KEY, null));

  const [step, setStep] = useState(draft?.step ?? 0);

  // --- goal ---
  const [goalTitle, setGoalTitle] = useState(draft?.goalTitle ?? "");
  const [goalCategory, setGoalCategory] = useState(draft?.goalCategory ?? null);
  const [goalWhy, setGoalWhy] = useState(draft?.goalWhy ?? "");
  const [weeklyTargetMinutes, setWeeklyTargetMinutes] = useState(draft?.weeklyTargetMinutes ?? 180);
  const [targetDate, setTargetDate] = useState(draft?.targetDate ?? "");
  const [steps, setSteps] = useState(draft?.steps ?? []);
  const [stepsSeeded, setStepsSeeded] = useState(draft?.stepsSeeded ?? false);
  const [newStepText, setNewStepText] = useState("");

  // --- screen time ---
  const [estimateHours, setEstimateHours] = useState(draft?.estimateHours ?? 4);
  const [targetMinutes, setTargetMinutes] = useState(draft?.targetMinutes ?? 195);

  const estimateMinutes = Math.round(estimateHours * 60);
  const reclaimedPerDay = Math.max(0, estimateMinutes - targetMinutes);
  const annualHours = projectAnnualHours(reclaimedPerDay);

  // Seed suggested steps once, the first time we land on the steps screen —
  // after that, it's the user's own edited list, not the template.
  useEffect(() => {
    if (step === 3 && !stepsSeeded) {
      setSteps(templateStepsFor(goalCategory || "other"));
      setStepsSeeded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Persist progress as a draft so reopening mid-onboarding resumes where
  // the user left off instead of restarting the flow. Cleared on finish()
  // below (and on "Reset all data" in Settings) so it never resurfaces
  // stale answers for a later, separate onboarding attempt.
  useEffect(() => {
    saveValue(DRAFT_KEY, {
      step, goalTitle, goalCategory, goalWhy, weeklyTargetMinutes, targetDate,
      steps, stepsSeeded, estimateHours, targetMinutes,
    });
  }, [step, goalTitle, goalCategory, goalWhy, weeklyTargetMinutes, targetDate, steps, stepsSeeded, estimateHours, targetMinutes]);

  // Guard against Android's hardware/gesture back button exiting onboarding
  // outright from the middle of the flow (jarring, and easy to trigger by
  // accident) instead of just stepping back one screen the way the in-app
  // Back button does. One sentinel history entry is kept underneath the
  // current step at all times; popping it steps backward and immediately
  // pushes a fresh sentinel so the *next* back press is caught too. At step
  // 0 there's nothing left to intercept, so back is free to actually leave
  // onboarding, same as tapping back on a screen with no "Back" button.
  useEffect(() => {
    window.history.pushState({ onboardingSentinel: true }, "");
    function handlePopState() {
      setStep((s) => {
        if (s === 0) return s;
        window.history.pushState({ onboardingSentinel: true }, "");
        return s - 1;
      });
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function removeStep(i) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addCustomStep() {
    if (!newStepText.trim()) return;
    setSteps((prev) => [...prev, newStepText.trim()]);
    setNewStepText("");
  }

  function goNext() {
    if (step === 4) setTargetMinutes(Math.max(30, estimateMinutes - 45));
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }
  // Routed through the same history entry the hardware/gesture back button
  // consumes (see the popstate effect above), so both paths decrement the
  // step identically instead of drifting out of sync.
  function goBack() {
    window.history.back();
  }

  function finish(goToFocus) {
    const createdGoal = actions.completeOnboarding({
      estimateMinutesPerDay: estimateMinutes,
      timeBackGoals: goalCategory ? [goalCategory] : [],
      dailyTargetMinutes: targetMinutes,
      goal: {
        title: goalTitle,
        category: goalCategory || "other",
        why: goalWhy,
        steps,
        weeklyTargetMinutes,
        targetDate: targetDate || null,
      },
    });
    if (goToFocus && createdGoal && createdGoal.steps[0]) {
      actions.setPendingSessionContext({ goalId: createdGoal.id, stepId: createdGoal.steps[0].id });
    }
    saveValue(DRAFT_KEY, null);
    navigate(goToFocus ? "/focus" : "/", { replace: true });
  }

  const canContinueFromGoal = goalTitle.trim().length > 0 && !!goalCategory;

  return (
    <div className="onboarding">
      <div className="onb-step" key={step}>
        {step === 0 && (
          <>
            <div className="onb-icon" aria-hidden="true">⏳</div>
            <h1>Take your time back.</h1>
            <p className="lead">
              Where'd my time go? isn't a screen-time tracker. It's here to help you notice the time
              you get back — and put it toward something that actually matters to you.
            </p>
            <div className="onboarding-nav">
              <button className="primary btn-lg" onClick={goNext}>Get started</button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="onb-icon" aria-hidden="true">🎯</div>
            <h1>What do you want to work toward?</h1>
            <p className="lead">Something real and specific — "learn Spanish," "run a 5K," "finish my book." This becomes the point of the app.</p>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="e.g. Learn to play guitar"
                aria-label="What you want to work toward"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                style={{ textAlign: "center", fontSize: 16 }}
              />
            </div>
            <div className="onboarding-goals">
              {TIME_BACK_REASONS.map((r) => (
                <button
                  key={r.id}
                  className={"chip-toggle" + (goalCategory === r.id ? " selected" : "")}
                  onClick={() => setGoalCategory(r.id)}
                >
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
            <div className="form-row" style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Why does this matter to you? (optional)"
                aria-label="Why this matters to you (optional)"
                value={goalWhy}
                onChange={(e) => setGoalWhy(e.target.value)}
              />
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" disabled={!canContinueFromGoal} onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onb-icon" aria-hidden="true">🗓</div>
            <h1>How much time can you realistically give this each week?</h1>
            <p className="lead">Be honest, not ambitious — a target you'll actually hit beats one you won't.</p>
            <div className="onb-estimate-input">
              <input
                type="number"
                min="15"
                step="15"
                aria-label="Weekly target in minutes"
                value={weeklyTargetMinutes}
                onChange={(e) => setWeeklyTargetMinutes(Number(e.target.value))}
              />
              <span className="unit">minutes a week</span>
            </div>
            <p className="lead" style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}>Target date (optional)</p>
            <div className="form-row" style={{ justifyContent: "center", marginBottom: 16 }}>
              <input
                type="date"
                aria-label="Target date (optional)"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ maxWidth: 200, textAlign: "center" }}
              />
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Let's rough out your first steps</h1>
            <p className="lead">
              A starting scaffold for "{goalTitle}" — keep what's useful, drop what isn't, add your own.
            </p>
            <div className="step-list">
              {steps.map((s, i) => (
                <div className="step-row" key={i}>
                  <span>{s}</span>
                  <button className="link" onClick={() => removeStep(i)} aria-label="Remove step">✕</button>
                </div>
              ))}
              {steps.length === 0 && <p className="empty">No steps yet — add one below.</p>}
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Add your own step"
                aria-label="Add your own step"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomStep()}
              />
              <button className="secondary" onClick={addCustomStep}>Add</button>
            </div>
            <div className="onboarding-nav row" style={{ marginTop: 20 }}>
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="onb-icon" aria-hidden="true">📱</div>
            <h1>How much time do you spend on your phone?</h1>
            <p className="lead">A rough daily average is fine — you can refine this later with real data.</p>
            <div className="onb-estimate-input">
              <input
                type="number"
                min="0"
                step="0.5"
                aria-label="Estimated hours per day on your phone"
                value={estimateHours}
                onChange={(e) => setEstimateHours(Number(e.target.value))}
              />
              <span className="unit">hours a day</span>
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="onb-icon" aria-hidden="true">🧭</div>
            <h1>Set your daily target</h1>
            <p className="lead">
              Based on your ~{formatHoursMinutes(estimateMinutes)} average, here's a starting point.
              You can change this any time.
            </p>
            <div className="onb-estimate-input">
              <input
                type="number"
                min="10"
                step="5"
                aria-label="Daily target in minutes"
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(Number(e.target.value))}
              />
              <span className="unit">minutes a day</span>
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h1>Here's what that adds up to</h1>
            <div className="projection-box">
              <p>If you reclaim just</p>
              <div className="big num">{formatHoursMinutes(reclaimedPerDay)} a day</div>
              <p>that's about</p>
              <div className="big num">~{annualHours} hours</div>
              <p>a year you could put toward "{goalTitle}."</p>
              <p className="estimate-note">
                Your {formatHoursMinutes(weeklyTargetMinutes)}/week goal target is well within that. An estimate,
                not a promise — real life varies, and that's fine.
              </p>
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <div className="onb-icon" aria-hidden="true">🌤</div>
            <h1>Let's take your first step toward "{goalTitle}."</h1>
            <p className="lead">
              {steps[0] ? `First up: ${steps[0]}` : "Start a short focus session, or head to your dashboard."}
            </p>
            <div className="onboarding-nav">
              <button className="primary btn-lg" onClick={() => finish(true)}>Start a reclaim session</button>
              <button className="link" onClick={() => finish(false)}>Go to my dashboard</button>
            </div>
          </>
        )}
      </div>

      <div className="onboarding-dots">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <span key={i} className={"dot" + (i === step ? " active" : "")} />
        ))}
      </div>
    </div>
  );
}
