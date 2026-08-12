import { useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";

const PRESETS = [10, 25, 45];

export default function Focus() {
  const { state, actions } = useAppState();
  const active = state.activeFocusSession;

  const [customMinutes, setCustomMinutes] = useState(15);
  const [justCompleted, setJustCompleted] = useState(null); // minutes, briefly shown
  const [tick, setTick] = useState(0); // forces re-render every second while active
  const completingRef = useRef(false);

  // Real-time based, not a decrementing counter — so it stays correct even
  // if the tab is backgrounded/throttled and ticks get skipped or batched.
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
      actions.completeActiveFocusSession();
      setJustCompleted(minutes);
    }
    if (!active) completingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, active, remainingMs]);

  function start(minutes) {
    setJustCompleted(null);
    actions.startFocusSession(minutes);
  }

  function mm(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Reclaim Time</h1>
        <p>A focused block, phone-free — added straight to your Time Bank when it's done.</p>
      </div>

      {justCompleted != null && !active && (
        <section className="card" style={{ textAlign: "center" }}>
          <div className="headline" style={{ fontSize: 20 }}>
            {formatHoursMinutes(justCompleted)} reclaimed.
          </div>
          <p className="sub" style={{ marginBottom: 0 }}>Nice work. It's in your Time Bank now.</p>
        </section>
      )}

      <section className="card" style={{ textAlign: "center" }}>
        {active ? (
          <>
            <div className="timer-circle" style={{ borderTopColor: progress > 0.98 ? "var(--good)" : "var(--accent)" }}>
              <span className="time">{mm(remainingSeconds)}</span>
            </div>
            <p className="sub">Reclaiming {active.durationMinutes} minutes.</p>
            <button className="secondary" onClick={() => actions.cancelActiveFocusSession()}>
              Cancel session
            </button>
          </>
        ) : (
          <>
            <p className="sub">Choose a length:</p>
            <div className="duration-picker">
              {PRESETS.map((m) => (
                <button key={m} className="primary" onClick={() => start(m)}>
                  Reclaim {m} min
                </button>
              ))}
            </div>
            <div className="form-row" style={{ justifyContent: "center", marginTop: 16 }}>
              <input
                type="number"
                min="1"
                max="240"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                style={{ maxWidth: 90, textAlign: "center" }}
              />
              <button className="secondary" onClick={() => start(Math.max(1, customMinutes))}>
                Custom
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
