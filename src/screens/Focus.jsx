import { useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { useCelebration } from "../state/CelebrationContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import ProgressRing from "../components/ProgressRing";

const PRESETS = [10, 25, 45];

export default function Focus() {
  const { state, actions } = useAppState();
  const { celebrate } = useCelebration();
  const active = state.activeFocusSession;

  const [customMinutes, setCustomMinutes] = useState(15);
  const [justCompleted, setJustCompleted] = useState(null);
  const [tick, setTick] = useState(0);
  const completingRef = useRef(false);

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
      celebrate({ icon: "⏳", title: `${formatHoursMinutes(minutes)} reclaimed`, subtitle: "Straight into your Time Bank." });
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
        <section className="card reclaim-result">
          <div className="icon" aria-hidden="true">✓</div>
          <div className="amount num">{formatHoursMinutes(justCompleted)} reclaimed</div>
          <p className="sub" style={{ marginBottom: 0, marginTop: 4 }}>Nice work. It's in your Time Bank now.</p>
        </section>
      )}

      <section className="card timer-stage">
        {active ? (
          <>
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
  );
}
