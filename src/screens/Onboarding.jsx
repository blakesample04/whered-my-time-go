import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { TIME_BACK_REASONS } from "../state/defaultState";
import { projectAnnualHours } from "../lib/reclaim";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { templateStepsFor } from "../lib/goalTemplates";

const STEP_COUNT = 7;

export default function Onboarding() {
  const { actions } = useAppState();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // --- goal ---
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState(null);
  const [goalWhy, setGoalWhy] = useState("");
  const [steps, setSteps] = useState([]);
  const [stepsSeeded, setStepsSeeded] = useState(false);
  const [newStepText, setNewStepText] = useState("");

  // --- screen time ---
  const [estimateHours, setEstimateHours] = useState(4);
  const [targetMinutes, setTargetMinutes] = useState(195);

  const estimateMinutes = Math.round(estimateHours * 60);
  const reclaimedPerDay = Math.max(0, estimateMinutes - targetMinutes);
  const annualHours = projectAnnualHours(reclaimedPerDay);

  // Seed suggested steps once, the first time we land on the steps screen —
  // after that, it's the user's own edited list, not the template.
  useEffect(() => {
    if (step === 2 && !stepsSeeded) {
      setSteps(templateStepsFor(goalCategory || "other"));
      setStepsSeeded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function removeStep(i) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addCustomStep() {
    if (!newStepText.trim()) return;
    setSteps((prev) => [...prev, newStepText.trim()]);
    setNewStepText("");
  }

  function goNext() {
    if (step === 3) setTargetMinutes(Math.max(30, estimateMinutes - 45));
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function finish(goToFocus) {
    actions.completeOnboarding({
      estimateMinutesPerDay: estimateMinutes,
      timeBackGoals: goalCategory ? [goalCategory] : [],
      dailyTargetMinutes: targetMinutes,
      goal: { title: goalTitle, category: goalCategory || "other", why: goalWhy, steps },
    });
    navigate(goToFocus ? "/focus" : "/", { replace: true });
  }

  const canContinueFromGoal = goalTitle.trim().length > 0 && !!goalCategory;

  return (
    <div className="onboarding">
      <div className="onb-step" key={step}>
        {step === 0 && (
          <>
            <div className="onb-icon">⏳</div>
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
            <div className="onb-icon">🎯</div>
            <h1>What do you want to work toward?</h1>
            <p className="lead">Something real and specific — "learn Spanish," "run a 5K," "finish my book." This becomes the point of the app.</p>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="e.g. Learn to play guitar"
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

        {step === 3 && (
          <>
            <div className="onb-icon">📱</div>
            <h1>How much time do you spend on your phone?</h1>
            <p className="lead">A rough daily average is fine — you can refine this later with real data.</p>
            <div className="onb-estimate-input">
              <input
                type="number"
                min="0"
                step="0.5"
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

        {step === 4 && (
          <>
            <div className="onb-icon">🧭</div>
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

        {step === 5 && (
          <>
            <h1>Here's what that adds up to</h1>
            <div className="projection-box">
              <p>If you reclaim just</p>
              <div className="big num">{formatHoursMinutes(reclaimedPerDay)} a day</div>
              <p>that's about</p>
              <div className="big num">~{annualHours} hours</div>
              <p>a year you could put toward "{goalTitle}."</p>
              <p className="estimate-note">
                An estimate, not a promise — based on staying near today's target. Real life varies, and that's fine.
              </p>
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <div className="onb-icon">🌤</div>
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
