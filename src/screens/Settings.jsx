import { useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { todayISO } from "../lib/dateUtils";
import { formatHoursMinutes, headlineStat } from "../lib/timeTranslator";
import { computeRecoveredMinutes, totalMinutesForApp } from "../lib/goals";
import { parseCSV, splitHeaderAndRows, guessColumnMapping, normalizeRows } from "../lib/csvImport";
import { BUDGET_CATEGORIES } from "../state/defaultState";
import { PREMIUM_FEATURES } from "../lib/premium";
import Toggle from "../components/Toggle";
import EmptyState from "../components/EmptyState";

export default function Settings() {
  const { state, derived, actions } = useAppState();

  // --- daily target ---
  const [targetInput, setTargetInput] = useState(derived.todaysTarget ?? 240);

  // --- manual usage entry ---
  const [usageForm, setUsageForm] = useState({ date: todayISO(), appName: "", minutes: "" });

  // --- per-app goals ---
  const [goalForm, setGoalForm] = useState({ appName: "", baselineMinutesPerDay: "", dailyLimitMinutes: "" });

  // --- csv import ---
  const [importState, setImportState] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");

  // --- time budget ---
  const [budgetForm, setBudgetForm] = useState(
    () =>
      state.timeBudget || {
        goals: 90,
        school: 60,
        health: 45,
        social: 120,
        entertainment: 120,
        other: 0,
      }
  );

  function handleSaveBudget(e) {
    e.preventDefault();
    actions.setTimeBudget({ ...budgetForm });
  }

  function handleSetTarget(e) {
    e.preventDefault();
    const minutes = Number(targetInput);
    if (!minutes || minutes <= 0) return;
    actions.setDailyTarget(minutes);
  }

  function handleAddUsage(e) {
    e.preventDefault();
    const minutes = Number(usageForm.minutes);
    if (!usageForm.appName.trim() || !minutes || minutes <= 0) return;
    actions.addUsageEntry({ date: usageForm.date, appName: usageForm.appName.trim(), minutes });
    setUsageForm({ date: todayISO(), appName: "", minutes: "" });
  }

  function handleAddGoal(e) {
    e.preventDefault();
    const baseline = Number(goalForm.baselineMinutesPerDay);
    const limit = Number(goalForm.dailyLimitMinutes);
    if (!goalForm.appName.trim() || !baseline || !limit) return;
    actions.addAppGoal({ appName: goalForm.appName.trim(), baselineMinutesPerDay: baseline, dailyLimitMinutes: limit });
    setGoalForm({ appName: "", baselineMinutesPerDay: "", dailyLimitMinutes: "" });
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportSummary(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        const { headers, dataRows } = splitHeaderAndRows(rows);
        if (headers.length === 0 || dataRows.length === 0) {
          setImportError("Couldn't find any rows in that file.");
          return;
        }
        setImportState({ headers, dataRows, mapping: guessColumnMapping(headers) });
      } catch {
        setImportError("Couldn't read that file as CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function updateMapping(field, value) {
    setImportState({ ...importState, mapping: { ...importState.mapping, [field]: Number(value) } });
  }

  function handleImportConfirm() {
    const { dataRows, mapping } = importState;
    if (mapping.dateCol === -1 || mapping.appCol === -1 || mapping.minutesCol === -1) {
      setImportError("Please choose a column for Date, App, and Duration before importing.");
      return;
    }
    const { entries, skipped } = normalizeRows(dataRows, mapping);
    actions.importUsageEntries(entries);
    setImportSummary({ imported: entries.length, skipped });
    setImportState(null);
  }

  const appNames = [...new Set(state.usageLog.map((u) => u.appName))];

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Settings</h1>
        <p>Your targets and data — all changeable, nothing lost. Manage your Goal on the Progress tab.</p>
      </div>

      <section className="card">
        <h2>Daily target</h2>
        <p className="sub">
          Changing this only affects today onward — your history keeps whatever target was active on each past day.
        </p>
        <form onSubmit={handleSetTarget}>
          <div className="form-row">
            <input type="number" min="10" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} />
            <span style={{ color: "var(--text)", flex: "0 0 auto" }}>minutes/day</span>
            <button className="primary" type="submit">Save</button>
          </div>
        </form>
        {derived.todaysTarget != null && (
          <p className="sub" style={{ marginBottom: 0 }}>Current: {formatHoursMinutes(derived.todaysTarget)}/day</p>
        )}
      </section>

      <section className="card">
        <h2>Time Budget</h2>
        <p className="sub">
          How you'd like to divide your discretionary time each day. Powers "today's discretionary time"
          and priorities on Home.
        </p>
        <form onSubmit={handleSaveBudget}>
          {BUDGET_CATEGORIES.map((c) => (
            <div className="form-row" key={c.id}>
              <span style={{ width: 130, flex: "0 0 auto", fontSize: 13.5, color: "var(--text-h)", fontWeight: 600 }}>
                {c.icon} {c.label}
              </span>
              <input
                type="number"
                min="0"
                step="15"
                value={budgetForm[c.id] || 0}
                onChange={(e) => setBudgetForm({ ...budgetForm, [c.id]: Number(e.target.value) })}
              />
              <span style={{ color: "var(--text-dim)", fontSize: 12, flex: "0 0 auto" }}>min/day</span>
            </div>
          ))}
          <button className="primary" type="submit" style={{ marginTop: 8 }}>Save budget</button>
        </form>
      </section>

      <section className="card">
        <h2>Notifications</h2>
        <p className="sub">
          In-app reminders only for now — real push notifications need a native app, which this web version isn't (yet).
        </p>
        <Toggle
          checked={state.notificationsEnabled}
          onChange={(checked) => actions.setNotificationsEnabled(checked)}
          label="Enable reminders"
        />
      </section>

      <section className="card">
        <h2>Log usage</h2>
        <p className="sub">Manual entry — or import a CSV below.</p>
        <form onSubmit={handleAddUsage}>
          <div className="form-row">
            <input type="date" value={usageForm.date} onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })} />
            <input type="text" placeholder="App name" value={usageForm.appName} onChange={(e) => setUsageForm({ ...usageForm, appName: e.target.value })} />
            <input type="number" min="1" placeholder="Minutes" value={usageForm.minutes} onChange={(e) => setUsageForm({ ...usageForm, minutes: e.target.value })} />
            <button className="primary" type="submit">Add</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Import from CSV</h2>
        <p className="sub">Any spreadsheet with a date, app name, and duration column. Duration can be minutes, "1h 23m", or "H:MM:SS".</p>
        <div className="form-row">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>
        {importError && <p className="empty" style={{ color: "var(--warn)" }}>{importError}</p>}
        {importSummary && (
          <p className="empty">
            Imported {importSummary.imported} entr{importSummary.imported === 1 ? "y" : "ies"}
            {importSummary.skipped > 0 ? `, skipped ${importSummary.skipped} unreadable row${importSummary.skipped === 1 ? "" : "s"}` : ""}.
          </p>
        )}
        {importState && (
          <div>
            <div className="form-row">
              <label>Date{" "}
                <select value={importState.mapping.dateCol} onChange={(e) => updateMapping("dateCol", e.target.value)}>
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
              <label>App{" "}
                <select value={importState.mapping.appCol} onChange={(e) => updateMapping("appCol", e.target.value)}>
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
              <label>Duration{" "}
                <select value={importState.mapping.minutesCol} onChange={(e) => updateMapping("minutesCol", e.target.value)}>
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <button className="primary" type="button" onClick={handleImportConfirm}>
                Import {importState.dataRows.length} rows
              </button>
              <button className="link" type="button" onClick={() => setImportState(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>App limits (optional)</h2>
        <p className="sub">A separate, optional per-app limit — independent of your overall daily target above. Different from your Goal on the Progress tab.</p>
        <form onSubmit={handleAddGoal}>
          <div className="form-row">
            <input type="text" placeholder="App name" value={goalForm.appName} onChange={(e) => setGoalForm({ ...goalForm, appName: e.target.value })} />
            <input type="number" min="1" placeholder="Used to spend (min/day)" value={goalForm.baselineMinutesPerDay} onChange={(e) => setGoalForm({ ...goalForm, baselineMinutesPerDay: e.target.value })} />
            <input type="number" min="1" placeholder="New limit (min/day)" value={goalForm.dailyLimitMinutes} onChange={(e) => setGoalForm({ ...goalForm, dailyLimitMinutes: e.target.value })} />
            <button className="primary" type="submit">Add</button>
          </div>
        </form>
        {state.appGoals.length === 0 && (
          <EmptyState icon="🧩" title="No app limits yet" body="Add one above if there's a specific app you want to rein in." />
        )}
        {state.appGoals.map((goal) => {
          const recovered = computeRecoveredMinutes(goal, state.usageLog);
          return (
            <div className="goal-block" key={goal.id}>
              <h3>{goal.appName}</h3>
              <div className="goal-meta">
                Baseline {formatHoursMinutes(goal.baselineMinutesPerDay)}/day · Limit {formatHoursMinutes(goal.dailyLimitMinutes)}/day
              </div>
              <div className="recovered">
                <div className="amount">{formatHoursMinutes(recovered)} recovered</div>
              </div>
              <button className="link" style={{ marginTop: 8 }} onClick={() => actions.removeAppGoal(goal.id)}>Remove</button>
            </div>
          );
        })}
      </section>

      {appNames.length > 0 && (
        <section className="card">
          <h2>All-time usage by app</h2>
          <p className="sub">Categorize each app so it counts toward the right Time Budget bucket above.</p>
          {appNames.map((name) => {
            const total = totalMinutesForApp(name, state.usageLog);
            return (
              <div className="app-block" key={name}>
                <h3>{name}</h3>
                <div className="total">{formatHoursMinutes(total)} — {headlineStat(total)}</div>
                <div className="form-row" style={{ marginTop: 6, marginBottom: 0 }}>
                  <select
                    value={state.appCategories[name] || ""}
                    onChange={(e) => actions.setAppCategory(name, e.target.value)}
                  >
                    <option value="">Uncategorized (counts as Other)</option>
                    {BUDGET_CATEGORIES.filter((c) => c.id !== "goals").map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h2>Premium</h2>
        <p className="sub">
          This toggle is a <strong>local test switch only</strong> — no real payment is processed. Real
          $1.99/month billing isn't connected yet.
        </p>
        <Toggle
          checked={state.isPremium}
          onChange={(checked) => actions.setPremium(checked)}
          label="Enable Premium (testing)"
        />
        <div className="step-list" style={{ marginTop: 14 }}>
          {PREMIUM_FEATURES.map((f) => (
            <div className="step-row" key={f.id}>
              <div className="step-row-left">
                <span style={{ color: state.isPremium ? "var(--good)" : "var(--text-dim)" }}>
                  {state.isPremium ? "✓" : "○"}
                </span>
                <span className="step-text">{f.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Reset</h2>
        <p className="sub">Clears everything — your goal, usage, targets, Time Bank, XP, streaks, achievements. Can't be undone.</p>
        <button
          className="secondary"
          onClick={() => {
            if (confirm("Reset all data in Where'd my time go? This can't be undone.")) actions.resetAllData();
          }}
        >
          Reset all data
        </button>
      </section>
    </div>
  );
}
