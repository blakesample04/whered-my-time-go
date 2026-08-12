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
import {
  parseCSV,
  splitHeaderAndRows,
  guessColumnMapping,
  normalizeRows,
} from "./lib/csvImport";

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

  const [importState, setImportState] = useState(null); // { headers, dataRows, mapping }
  const [importSummary, setImportSummary] = useState(null); // { imported, skipped }
  const [importError, setImportError] = useState("");

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
        const mapping = guessColumnMapping(headers);
        setImportState({ headers, dataRows, mapping });
      } catch {
        setImportError("Couldn't read that file as CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting the same file later
  }

  function updateMapping(field, value) {
    setImportState({
      ...importState,
      mapping: { ...importState.mapping, [field]: Number(value) },
    });
  }

  function handleImportConfirm() {
    const { dataRows, mapping } = importState;
    if (mapping.dateCol === -1 || mapping.appCol === -1 || mapping.minutesCol === -1) {
      setImportError("Please choose a column for Date, App, and Duration before importing.");
      return;
    }
    const { entries, skipped } = normalizeRows(dataRows, mapping);
    if (entries.length > 0) {
      const keySet = new Set(entries.map((e) => `${e.date}|${e.appName}`));
      const kept = usageLog.filter((u) => !keySet.has(`${u.date}|${u.appName}`));
      persistUsage([...kept, ...entries]);
    }
    setImportSummary({ imported: entries.length, skipped });
    setImportState(null);
  }

  function handleImportCancel() {
    setImportState(null);
    setImportError("");
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
        <h2>Import from CSV</h2>
        <p className="sub">
          Faster than typing entries one at a time. Any spreadsheet with a date, an app name, and a
          duration column works — export it as CSV from Google Sheets/Excel, or from a phone usage
          tracker if yours supports it. Duration can be minutes, "1h 23m", or "H:MM:SS".
        </p>
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
              <label>
                Date column{" "}
                <select
                  value={importState.mapping.dateCol}
                  onChange={(e) => updateMapping("dateCol", e.target.value)}
                >
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                App column{" "}
                <select
                  value={importState.mapping.appCol}
                  onChange={(e) => updateMapping("appCol", e.target.value)}
                >
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration column{" "}
                <select
                  value={importState.mapping.minutesCol}
                  onChange={(e) => updateMapping("minutesCol", e.target.value)}
                >
                  <option value={-1}>-- choose --</option>
                  {importState.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="sub">Preview (first {Math.min(5, importState.dataRows.length)} rows):</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {importState.headers.map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importState.dataRows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)" }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <button className="primary" type="button" onClick={handleImportConfirm}>
                Import {importState.dataRows.length} row{importState.dataRows.length === 1 ? "" : "s"}
              </button>
              <button className="link" type="button" onClick={handleImportCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
