import { useState } from "react";
import "./App.css";
import {
  headlineStat,
  minutesToComparisons,
  formatHoursMinutes,
} from "./lib/timeTranslator";
import {
  createGoal,
  computeRecoveredMinutes,
  totalMinutesForApp,
  loggedDayCount,
  isOverGoalToday,
} from "./lib/goals";

const USAGE_KEY = "recoup.usageLog";
const GOALS_KEY = "recoup.goals";

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [usageLog, setUsageLog] = useState(() => loadFromStorage(USAGE_KEY, []));
  const [goals, setGoals] = useState(() => loadFromStorage(GOALS_KEY, []));

  const [usageForm, setUsageForm] = useState({
    date: todayISO(),
    appName: "",
    minutes: "",
  });
  const [goalForm, setGoalForm] = useState({
    appName: "",
    baselineMinutesPerDay: "",
    dailyLimitMinutes: "",
  });

  function persistUsage(next) {
    setUsageLog(next);
    localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  }

  function persistGoals(next) {
    setGoals(next);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
  }

  function handleAddUsage(e) {
    e.preventDefault();
    const minutes = Number(usageForm.minutes);
    if (!usageForm.appName.trim() || !minutes || minutes <= 0) return;
    const entry = {
      date: usageForm.date,
      appName: usageForm.appName.trim(),
      minutes,
    };
    persistUsage([...usageLog, entry]);
    setUsageForm({ date: todayISO(), appName: "", minutes: "" });
  }

  function handleAddGoal(e) {
    e.preventDefault();
    const baseline = Number(goalForm.baselineMinutesPerDay);
    const limit = Number(goalForm.dailyLimitMinutes);
    if (!goalForm.appName.trim() || !baseline || !limit) return;
    const goal = createGoal({
      appName: goalForm.appName.trim(),
      baselineMinutesPerDay: baseline,
      dailyLimitMinutes: limit,
    });
    persistGoals([...goals, goal]);
    setGoalForm({ appName: "", baselineMinutesPerDay: "", dailyLimitMinutes: "" });
  }

  function removeGoal(id) {
    persistGoals(goals.filter((g) => g.id !== id));
  }

  const appNames = [...new Set(usageLog.map((u) => u.appName))];

  return (
    <>
      <header className="top">
        <h1>Recoup</h1>
        <p>Screen time, translated into what it actually costs you — and what you're getting back.</p>
      </header>

      <section className="card">
        <h2>Log usage</h2>
        <p className="sub">
          Enter what you spent on an app for a given day. (Real Android usage import comes later —
          this manual entry is the working version for now.)
        </p>
        <form onSubmit={handleAddUsage}>
          <div className="form-row">
            <input
              type="date"
              value={usageForm.date}
              onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })}
            />
            <input
              type="text"
              placeholder="App name (e.g. TikTok)"
              value={usageForm.appName}
              onChange={(e) => setUsageForm({ ...usageForm, appName: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="Minutes"
              value={usageForm.minutes}
              onChange={(e) => setUsageForm({ ...usageForm, minutes: e.target.value })}
            />
            <button className="primary" type="submit">Add</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Your time, translated</h2>
        <p className="sub">Total logged usage per app, reframed into something you can feel.</p>
        {appNames.length === 0 && <p className="empty">No usage logged yet — add some above.</p>}
        {appNames.map((name) => {
          const total = totalMinutesForApp(name, usageLog);
          const comparisons = minutesToComparisons(total).filter((c) => c.value >= 0.1);
          return (
            <div className="app-block" key={name}>
              <h3>{name}</h3>
              <div className="total">{formatHoursMinutes(total)} logged total</div>
              <div className="headline">
                That's {headlineStat(total)}.
              </div>
              <div className="comparisons">
                {comparisons.slice(0, 5).map((c) => (
                  <span className="chip" key={c.id}>
                    {c.value} {c.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>Set a goal</h2>
        <p className="sub">
          Tell us what you used to spend on an app daily (your baseline) and what you're aiming for now.
        </p>
        <form onSubmit={handleAddGoal}>
          <div className="form-row">
            <input
              type="text"
              placeholder="App name"
              value={goalForm.appName}
              onChange={(e) => setGoalForm({ ...goalForm, appName: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="Used to spend (min/day)"
              value={goalForm.baselineMinutesPerDay}
              onChange={(e) =>
                setGoalForm({ ...goalForm, baselineMinutesPerDay: e.target.value })
              }
            />
            <input
              type="number"
              min="1"
              placeholder="New daily goal (min)"
              value={goalForm.dailyLimitMinutes}
              onChange={(e) => setGoalForm({ ...goalForm, dailyLimitMinutes: e.target.value })}
            />
            <button className="primary" type="submit">Set goal</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Time recovered</h2>
        <p className="sub">
          Every day you land under your old baseline, that difference gets banked here — instead of
          just showing a smaller number, we show what it adds up to.
        </p>
        {goals.length === 0 && <p className="empty">No goals set yet — add one above.</p>}
        {goals.map((goal) => {
          const recovered = computeRecoveredMinutes(goal, usageLog);
          const days = loggedDayCount(goal, usageLog);
          const over = isOverGoalToday(goal, usageLog, todayISO());
          const hasToday = usageLog.some(
            (u) => u.appName === goal.appName && u.date === todayISO()
          );
          return (
            <div className="goal-block" key={goal.id}>
              <h3>{goal.appName}</h3>
              <div className="goal-meta">
                Baseline: {formatHoursMinutes(goal.baselineMinutesPerDay)}/day &middot; Goal:{" "}
                {formatHoursMinutes(goal.dailyLimitMinutes)}/day &middot; {days} day
                {days === 1 ? "" : "s"} logged
              </div>
              {hasToday && (
                <span className={`today-status ${over ? "over" : "under"}`}>
                  {over ? "Over goal today" : "Under goal today"}
                </span>
              )}
              <div className="recovered">
                <div className="amount">{formatHoursMinutes(recovered)} recovered</div>
                <div className="caption">
                  That's {headlineStat(recovered)} — time you got back, not just time you didn't spend.
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="link" onClick={() => removeGoal(goal.id)}>
                  Remove goal
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

export default App;
