import { useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { dailyReclaimedMinutes, trackedDates } from "../lib/reclaim";
import { addDays, parseISODate } from "../lib/dateUtils";
import ProgressBar from "../components/ProgressBar";
import ProgressRing from "../components/ProgressRing";
import AnimatedMinutes from "../components/AnimatedMinutes";
import ShareModal from "../components/ShareModal";

const ACHIEVEMENT_ICONS = {
  first_step: "👣",
  weekend: "🌅",
  five_hours_back: "⏱",
  the_week: "📅",
  hundred_hours: "💯",
  changed_routine: "🔄",
  two_week_streak: "🔥",
};

export default function Progress() {
  const { state, derived } = useAppState();
  const { timeBank, streak, level, achievements, nowIso } = derived;
  const [shareOpen, setShareOpen] = useState(false);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const tracked = new Set(trackedDates(state.usageLog));
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(nowIso, i - 6));
  // Untracked days (no usage ever logged for them) show as empty, not as
  // full-target false credit — target-minus-zero would otherwise look like
  // a perfect day that never actually happened.
  const last7Values = last7.map((d) => (tracked.has(d) ? dailyReclaimedMinutes(d, state.usageLog, state.targetHistory) || 0 : 0));
  const maxVal = Math.max(1, ...last7Values);

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Your Progress</h1>
        <p>Not perfection — intention. Here's where that's taken you.</p>
      </div>

      <section className="card bank-hero">
        <div className="section-label">Time Bank</div>
        <AnimatedMinutes minutes={timeBank.allTime} as="div" className="value" />

        <div className="mini-bars" aria-hidden="true">
          {last7Values.map((v, i) => (
            <div
              key={i}
              className={"mini-bar" + (i === 6 ? " filled" : "")}
              style={{ height: `${Math.max(6, (v / maxVal) * 60)}px` }}
            />
          ))}
        </div>
        <div className="mini-bar-label">
          {last7.map((d, i) => <span key={d}>{i === 6 ? "Today" : parseISODate(d).toLocaleDateString(undefined, { weekday: "narrow" })}</span>)}
        </div>

        <div className="bank-grid">
          <div className="cell"><div className="k">Today</div><div className="v">{formatHoursMinutes(timeBank.today)}</div></div>
          <div className="cell"><div className="k">Week</div><div className="v">{formatHoursMinutes(timeBank.week)}</div></div>
          <div className="cell"><div className="k">Month</div><div className="v">{formatHoursMinutes(timeBank.month)}</div></div>
          <div className="cell"><div className="k">All time</div><div className="v">{formatHoursMinutes(timeBank.allTime)}</div></div>
        </div>

        <p className="sub" style={{ marginTop: 14, marginBottom: 12, textAlign: "center" }}>
          This never resets on a bad day — every minute you've reclaimed stays banked.
        </p>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setShareOpen(true)}>
          Share your progress
        </button>
      </section>

      <section className="card">
        <div className="level-row">
          <ProgressRing progress={level.progress} size={64} stroke={6} gradientId="levelRing" trackColor="var(--border)">
            <span className="num" style={{ fontSize: 18, color: "var(--text-h)" }}>{level.level}</span>
          </ProgressRing>
          <div className="level-info">
            <div className="level-title">{level.title}</div>
            <div className="level-xp-caption">{level.xpIntoLevel} / {level.xpForNext} XP · {level.totalXp} total</div>
            <ProgressBar progress={level.progress} />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-label" style={{ marginBottom: 10 }}>Streak</div>
        <div style={{ display: "flex", gap: 28 }}>
          <div className="streak-flame-row">
            <span className={"streak-flame-icon" + (streak.current === 0 ? " dim" : "")}>🔥</span>
            <span className="streak-value num">{streak.current}</span>
          </div>
          {streak.graceAvailable > 0 && (
            <div>
              <div className="section-label">Grace banked</div>
              <div className="streak-value num" style={{ fontSize: 22 }}>🛟 {streak.graceAvailable}</div>
            </div>
          )}
        </div>
        <div className="streak-longest" style={{ marginTop: 8 }}>Longest run: {streak.longest} days</div>
        <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
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
        <div className="achv-grid">
          {achievements.map((a) => (
            <div className={"achv-tile" + (a.unlocked ? " unlocked" : "")} key={a.id}>
              <span className="achv-icon">{ACHIEVEMENT_ICONS[a.id] || "★"}</span>
              <div className="achv-title">{a.title}</div>
              <div className="achv-desc">{a.description}</div>
              <div className="achv-state">{a.unlocked ? "Unlocked" : "Locked"}</div>
            </div>
          ))}
        </div>
      </section>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eyebrow="I reclaimed"
        big={formatHoursMinutes(timeBank.allTime)}
        sub="of my time, lifetime."
        stats={[
          { label: "Level", value: `${level.level} · ${level.title}` },
          { label: "Streak", value: `${streak.current}d` },
        ]}
        shareText={`I've reclaimed ${formatHoursMinutes(timeBank.allTime)} of screen time with Where'd my time go?`}
        filename="time-bank"
      />
    </div>
  );
}
