import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import ProgressBar from "../components/ProgressBar";

export default function Progress() {
  const { derived } = useAppState();
  const { timeBank, streak, level, achievements } = derived;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Your Progress</h1>
        <p>Not perfection — intention. Here's where that's taken you.</p>
      </div>

      <section className="card time-bank-hero">
        <div className="label" style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text)" }}>Time Bank</div>
        <div className="value">{formatHoursMinutes(timeBank.allTime)}</div>
        <div className="time-bank-grid">
          <div className="cell"><div className="k">Today</div><div className="v">{formatHoursMinutes(timeBank.today)}</div></div>
          <div className="cell"><div className="k">Week</div><div className="v">{formatHoursMinutes(timeBank.week)}</div></div>
          <div className="cell"><div className="k">Month</div><div className="v">{formatHoursMinutes(timeBank.month)}</div></div>
          <div className="cell"><div className="k">All time</div><div className="v">{formatHoursMinutes(timeBank.allTime)}</div></div>
        </div>
        <p className="sub" style={{ marginTop: 14, marginBottom: 0 }}>
          This never resets on a bad day — every minute you've ever reclaimed stays banked.
        </p>
      </section>

      <section className="card">
        <div className="level-row">
          <span className="title">Lv. {level.level} — {level.title}</span>
          <span className="xp">{level.totalXp} XP total</span>
        </div>
        <ProgressBar progress={level.progress} />
        <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>
          {level.xpForNext - level.xpIntoLevel} XP to next level.
        </p>
      </section>

      <section className="card">
        <h2>Streak</h2>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div className="k" style={{ fontSize: 11, color: "var(--text)", textTransform: "uppercase" }}>Current</div>
            <div className="streak-badge" style={{ fontSize: 26 }}>🔥 {streak.current}</div>
          </div>
          <div>
            <div className="k" style={{ fontSize: 11, color: "var(--text)", textTransform: "uppercase" }}>Longest</div>
            <div className="streak-badge" style={{ fontSize: 26 }}>🏅 {streak.longest}</div>
          </div>
          {streak.graceAvailable > 0 && (
            <div>
              <div className="k" style={{ fontSize: 11, color: "var(--text)", textTransform: "uppercase" }}>Grace days banked</div>
              <div className="streak-badge" style={{ fontSize: 26 }}>🛟 {streak.graceAvailable}</div>
            </div>
          )}
        </div>
        <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>
          {streak.current > 0
            ? `You've stayed under your target for ${streak.current} day${streak.current === 1 ? "" : "s"} straight.`
            : streak.longest > 0
            ? "Your run ended. Your progress didn't — your longest streak and everything you've reclaimed are still yours."
            : "Meet your target today to start your first run."}
        </p>
      </section>

      <section className="card">
        <h2>Achievements</h2>
        <p className="sub">{unlockedCount} of {achievements.length} unlocked</p>
        <div className="achievement-grid">
          {achievements.map((a) => (
            <div className={"achievement" + (a.unlocked ? " unlocked" : "")} key={a.id}>
              <div className="title">{a.title}</div>
              <div className="desc">{a.description}</div>
              <div className="state">{a.unlocked ? "Unlocked" : "Locked"}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
