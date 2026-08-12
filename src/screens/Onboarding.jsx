import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { TIME_BACK_REASONS } from "../state/defaultState";
import { projectAnnualHours } from "../lib/reclaim";
import { formatHoursMinutes } from "../lib/timeTranslator";

const STEP_COUNT = 6;

export default function Onboarding() {
  const { actions } = useAppState();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [estimateHours, setEstimateHours] = useState(4);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [targetMinutes, setTargetMinutes] = useState(195);

  const estimateMinutes = Math.round(estimateHours * 60);
  const reclaimedPerDay = Math.max(0, estimateMinutes - targetMinutes);
  const annualHours = projectAnnualHours(reclaimedPerDay);

  function toggleGoal(id) {
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  function goNext() {
    if (step === 1) setTargetMinutes(Math.max(30, estimateMinutes - 45));
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function finish(goToFocus) {
    actions.completeOnboarding({
      estimateMinutesPerDay: estimateMinutes,
      timeBackGoals: selectedGoals,
      dailyTargetMinutes: targetMinutes,
    });
    navigate(goToFocus ? "/focus" : "/", { replace: true });
  }

  return (
    <div className="onboarding">
      <div className="onb-step" key={step}>
        {step === 0 && (
          <>
            <div className="onb-icon">⏳</div>
            <h1>Take your time back.</h1>
            <p className="lead">
              Where'd my time go? isn't here to guilt you about your phone. It's here to help you
              notice the time you get back when you're intentional — and put it toward things that
              actually matter to you.
            </p>
            <div className="onboarding-nav">
              <button className="primary btn-lg" onClick={goNext}>Get started</button>
            </div>
          </>
        )}

        {step === 1 && (
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

        {step === 2 && (
          <>
            <div className="onb-icon">🎯</div>
            <h1>What do you want your time back for?</h1>
            <p className="lead">Pick as many as you want. We'll use these to frame your reclaimed time.</p>
            <div className="onboarding-goals">
              {TIME_BACK_REASONS.map((g) => (
                <button
                  key={g.id}
                  className={"chip-toggle" + (selectedGoals.includes(g.id) ? " selected" : "")}
                  onClick={() => toggleGoal(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="onboarding-nav row">
              <button className="secondary" onClick={goBack}>Back</button>
              <button className="primary" onClick={goNext}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="onb-icon">🧭</div>
            <h1>Set your daily target</h1>
            <p className="lead">
              Based on your ~{formatHoursMinutes(estimateMinutes)} average, here's a starting point.
              You can change this any time — nothing about it is permanent.
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

        {step === 4 && (
          <>
            <h1>Here's what that adds up to</h1>
            <div className="projection-box">
              <p>If you reclaim just</p>
              <div className="big num">{formatHoursMinutes(reclaimedPerDay)} a day</div>
              <p>that's about</p>
              <div className="big num">~{annualHours} hours</div>
              <p>over a year.</p>
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

        {step === 5 && (
          <>
            <div className="onb-icon">🌤</div>
            <h1>Let's get your first {formatHoursMinutes(Math.min(45, reclaimedPerDay || 45))} back.</h1>
            <p className="lead">
              Start a short focus session now, or head straight to your dashboard — either way, you're set up.
            </p>
            <div className="onboarding-nav">
              <button className="primary btn-lg" onClick={() => finish(true)}>Start a reclaim session</button>
              <button className="link" onClick={() => finish(false)}>Skip to dashboard</button>
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
