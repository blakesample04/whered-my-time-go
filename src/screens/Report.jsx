import { useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { REFLECTION_CATEGORIES, aggregateByCategory, categoryLabel } from "../lib/reflections";
import { startOfMonth, addDays, dayOfWeekLabel, parseISODate, todayISO } from "../lib/dateUtils";
import { dailyReclaimedMinutes, trackedDates } from "../lib/reclaim";
import { budgetCategoryLabel } from "../state/defaultState";
import { isFeatureUnlocked } from "../lib/premium";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import ShareModal from "../components/ShareModal";
import PremiumGate from "../components/PremiumGate";

function biggestWin(report) {
  if (report.mostImproved) return `${report.mostImproved.appName} usage dropped ${report.mostImproved.pctChange}% from last week.`;
  if (report.reclaimedChange > 0) return `You reclaimed ${formatHoursMinutes(report.reclaimedChange)} more than last week.`;
  if (report.bestDay) return `${report.bestDay.label} was your best day — ${formatHoursMinutes(report.bestDay.reclaimed)} reclaimed.`;
  return null;
}

// A plain, local sentence built from real numbers — not an AI call. See
// lib/purpose.js / lib/recovery.js for where these come from.
function goalReflection(activeGoal, thisWeekMinutes, lastWeekMinutes) {
  if (!activeGoal || (thisWeekMinutes === 0 && lastWeekMinutes === 0)) return null;
  let sentence = `You spent ${formatHoursMinutes(thisWeekMinutes)} working toward "${activeGoal.title}" this week`;
  if (lastWeekMinutes > 0) {
    if (thisWeekMinutes > lastWeekMinutes) sentence += `, up from ${formatHoursMinutes(lastWeekMinutes)} last week`;
    else if (thisWeekMinutes < lastWeekMinutes) sentence += `, down from ${formatHoursMinutes(lastWeekMinutes)} last week`;
    else sentence += ", the same as last week";
  }
  return sentence + ".";
}

export default function Report() {
  const { state, derived, actions } = useAppState();
  const report = derived.weeklyReport;
  const { activeGoal, activeGoalMinutesThisWeek, activeGoalRecoveryPlan, patterns } = derived;
  const [shareOpen, setShareOpen] = useState(false);

  const advancedUnlocked = isFeatureUnlocked("advanced_report", state.isPremium);
  const recoveryUnlocked = isFeatureUnlocked("recovery", state.isPremium);

  const lastWeekGoalStart = addDays(report.thisWeekStart, -7);
  const lastWeekGoalEnd = addDays(report.thisWeekStart, -1);
  const lastWeekGoalMinutes = activeGoal
    ? state.focusSessions
        .filter((s) => s.goalId === activeGoal.id && s.date >= lastWeekGoalStart && s.date <= lastWeekGoalEnd)
        .reduce((sum, s) => sum + s.minutes, 0)
    : 0;
  const goalReflectionText = goalReflection(activeGoal, activeGoalMinutesThisWeek, lastWeekGoalMinutes);

  const monthStart = startOfMonth(derived.nowIso);
  const monthTotals = aggregateByCategory(state.reflections, monthStart, derived.nowIso);
  const monthTotalMinutes = Object.values(monthTotals).reduce((a, b) => a + b, 0);
  const maxCategoryMinutes = Math.max(1, ...Object.values(monthTotals));

  const tracked = new Set(trackedDates(state.usageLog));
  const todayIso = todayISO();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(report.thisWeekStart, i));
  // Untracked days (no usage logged, including future days later in the
  // week) render as empty rather than a false full-target credit.
  const weekValues = weekDays.map((d) => (tracked.has(d) ? dailyReclaimedMinutes(d, state.usageLog, state.targetHistory) || 0 : 0));
  const maxWeekVal = Math.max(1, ...weekValues);
  const win = biggestWin(report);

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Your Week</h1>
        <p>{dayOfWeekLabel(report.thisWeekStart)}, {report.thisWeekStart} – {report.thisWeekEnd}</p>
      </div>

      {!report.hasEnoughData ? (
        <section className="card">
          <EmptyState
            icon="📊"
            title="Your story starts today."
            body="Log a bit of screen time and your first weekly recap will show up here."
          />
        </section>
      ) : (
        <>
          <section className="card recap-hero">
            <div className="section-label">Time Reclaimed</div>
            <div className="value num">{formatHoursMinutes(report.thisWeekReclaimed)}</div>
            <span className={"recap-delta " + (report.reclaimedChange > 0 ? "good" : "flat")}>
              {report.reclaimedChange > 0 ? "▲" : "•"} {formatHoursMinutes(Math.abs(report.reclaimedChange))} vs last week
            </span>

            <div className="recap-chart" aria-hidden="true">
              {weekValues.map((v, i) => (
                <div className="recap-bar-col" key={i}>
                  <div
                    className={"recap-bar" + (weekDays[i] === todayIso ? " today" : "")}
                    style={{ height: `${Math.max(3, (v / maxWeekVal) * 90)}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="mini-bar-label">
              {weekDays.map((d) => <span key={d}>{parseISODate(d).toLocaleDateString(undefined, { weekday: "narrow" })}</span>)}
            </div>

            {win && (
              <div className="win-callout" style={{ marginTop: 18 }}>
                <span className="icon" aria-hidden="true">🏆</span>
                <span className="text">{win}</span>
              </div>
            )}

            <button className="secondary" style={{ width: "100%", marginTop: 14 }} onClick={() => setShareOpen(true)}>
              Share this week
            </button>
          </section>

          <section className="card">
            <div className="report-stat">
              <span className="label">Screen time</span>
              <span className="value">{report.usageChange >= 0 ? "↓" : "↑"} {formatHoursMinutes(Math.abs(report.usageChange))} vs last week</span>
            </div>
            <div className="report-stat">
              <span className="label">Most improved app</span>
              <span className="value">{report.mostImproved ? `${report.mostImproved.appName} ↓ ${report.mostImproved.pctChange}%` : "—"}</span>
            </div>
            <div className="report-stat">
              <span className="label">Biggest time sink</span>
              <span className="value">{report.biggestTimeSink ? `${report.biggestTimeSink.appName} — ${formatHoursMinutes(report.biggestTimeSink.minutes)}` : "—"}</span>
            </div>
            <div className="report-stat">
              <span className="label">Best day</span>
              <span className="value">{report.bestDay ? `${report.bestDay.label} — ${formatHoursMinutes(report.bestDay.reclaimed)} reclaimed` : "—"}</span>
            </div>
          </section>

          <section className="card-glow">
            <div className="section-label">Next Week</div>
            <p style={{ marginTop: 6, fontWeight: 700, color: "var(--text-h)", fontSize: 15 }}>
              Reclaim {report.nextWeekGoalMinutes} more minutes than this week.
            </p>
          </section>
        </>
      )}

      {/* Goal reflection/recovery are driven by goal-session data, not the
          screen-time weekly report above — they can have something useful
          to say even in a week with no screen time logged yet, so they're
          deliberately NOT nested inside the hasEnoughData gate. */}
      {(goalReflectionText || patterns.biggestDistraction) && (
        <PremiumGate unlocked={advancedUnlocked} label="Deeper weekly reflection — Premium">
          <section className="card">
            <h2>Your Reflection</h2>
            {goalReflectionText && <p className="sub" style={{ marginBottom: patterns.biggestDistraction ? 10 : 0 }}>{goalReflectionText}</p>}
            {patterns.biggestDistraction && (
              <p className="sub" style={{ marginBottom: 0 }}>
                Your biggest opportunity: {budgetCategoryLabel(patterns.biggestDistraction)} took the most of your
                non-goal time this period — trimming even a little there could go straight toward your goal instead.
              </p>
            )}
          </section>
        </PremiumGate>
      )}

      {activeGoalRecoveryPlan && (
        <PremiumGate unlocked={recoveryUnlocked} label="Goal recovery plans — Premium">
          <section className="recovery-card">
            <div className="section-label">Behind on "{activeGoal.title}"</div>
            <p style={{ margin: "6px 0 12px", fontWeight: 700, color: "var(--text-h)", fontSize: 14.5 }}>
              You're {formatHoursMinutes(activeGoalRecoveryPlan.shortfallMinutes)} behind this week's target. Here's a
              realistic way back:
            </p>
            {activeGoalRecoveryPlan.sessions.map((s) => (
              <div className="recovery-row" key={s.date}>
                <span className="day">{dayOfWeekLabel(s.date)}</span>
                <span className="amount">{formatHoursMinutes(s.minutes)}</span>
              </div>
            ))}
            {state.recoveryPlan?.weekStart === activeGoalRecoveryPlan.weekStart ? (
              <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>✓ Plan accepted</p>
            ) : (
              <button className="primary" style={{ width: "100%", marginTop: 12 }} onClick={() => actions.acceptRecoveryPlan(activeGoalRecoveryPlan)}>
                Accept this plan
              </button>
            )}
          </section>
        </PremiumGate>
      )}

      <section className="card">
        <h2>This Month</h2>
        <p className="sub">{formatHoursMinutes(monthTotalMinutes)} reclaimed, by what you did with it.</p>
        {monthTotalMinutes === 0 ? (
          <EmptyState
            icon="🌱"
            title="Nothing logged yet"
            body="Reflections show up here after you tell us what you did with reclaimed time."
          />
        ) : (
          REFLECTION_CATEGORIES.filter((c) => monthTotals[c.id]).map((c) => (
            <div className="category-bar-row" key={c.id}>
              <span className="name">{categoryLabel(c.id)}</span>
              <span className="track"><ProgressBar progress={monthTotals[c.id] / maxCategoryMinutes} /></span>
              <span className="amount">{formatHoursMinutes(monthTotals[c.id])}</span>
            </div>
          ))
        )}
      </section>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eyebrow="This week I reclaimed"
        big={formatHoursMinutes(report.thisWeekReclaimed)}
        sub={win || "Making progress, one day at a time."}
        stats={[
          { label: "Screen time", value: formatHoursMinutes(report.thisWeekUsage) },
          { label: "vs last week", value: `${report.reclaimedChange >= 0 ? "+" : ""}${formatHoursMinutes(Math.abs(report.reclaimedChange))}` },
        ]}
        shareText={`This week I reclaimed ${formatHoursMinutes(report.thisWeekReclaimed)} of screen time with Where'd my time go?`}
        filename="weekly-recap"
      />
    </div>
  );
}
