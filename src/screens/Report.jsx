import { useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { formatHoursMinutes } from "../lib/timeTranslator";
import { REFLECTION_CATEGORIES, aggregateByCategory, categoryLabel } from "../lib/reflections";
import { startOfMonth } from "../lib/dateUtils";
import ProgressBar from "../components/ProgressBar";

export default function Report() {
  const { state, derived } = useAppState();
  const report = derived.weeklyReport;
  const [copied, setCopied] = useState(false);

  const monthStart = startOfMonth(derived.nowIso);
  const monthTotals = aggregateByCategory(state.reflections, monthStart, derived.nowIso);
  const monthTotalMinutes = Object.values(monthTotals).reduce((a, b) => a + b, 0);
  const maxCategoryMinutes = Math.max(1, ...Object.values(monthTotals));

  function shareSummary() {
    const text = `This week I reclaimed ${formatHoursMinutes(report.thisWeekReclaimed)} of screen time with Recoup.`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }

  return (
    <div className="screen">
      <div className="screen-title">
        <h1>Your Week</h1>
        <p>{report.thisWeekStart} – {report.thisWeekEnd}</p>
      </div>

      {!report.hasEnoughData ? (
        <section className="card">
          <p className="empty">No usage logged yet this week. Log some time to see your first report.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="report-stat">
              <span className="label">Screen time</span>
              <span className="value">
                {report.usageChange >= 0 ? "↓" : "↑"} {formatHoursMinutes(Math.abs(report.usageChange))} vs last week
              </span>
            </div>
            <div className="report-stat">
              <span className="label">Time reclaimed</span>
              <span className="value good">
                {report.reclaimedChange >= 0 ? "+" : "−"}{formatHoursMinutes(Math.abs(report.reclaimedChange))} vs last week
              </span>
            </div>
            <div className="report-stat">
              <span className="label">Most improved app</span>
              <span className="value">
                {report.mostImproved ? `${report.mostImproved.appName} ↓ ${report.mostImproved.pctChange}%` : "—"}
              </span>
            </div>
            <div className="report-stat">
              <span className="label">Biggest time sink</span>
              <span className="value">
                {report.biggestTimeSink ? `${report.biggestTimeSink.appName} — ${formatHoursMinutes(report.biggestTimeSink.minutes)}` : "—"}
              </span>
            </div>
            <div className="report-stat">
              <span className="label">Best day</span>
              <span className="value">
                {report.bestDay ? `${report.bestDay.label} — ${formatHoursMinutes(report.bestDay.reclaimed)} reclaimed` : "—"}
              </span>
            </div>
          </section>

          <section className="card" style={{ textAlign: "center" }}>
            <div className="headline">You reclaimed {formatHoursMinutes(report.thisWeekReclaimed)} this week.</div>
            <button className="secondary" style={{ marginTop: 12 }} onClick={shareSummary}>
              {copied ? "Copied!" : "Share"}
            </button>
          </section>

          <section className="card">
            <h2>Next Week</h2>
            <p className="sub" style={{ marginBottom: 0 }}>
              Reclaim {report.nextWeekGoalMinutes} more minutes than this week.
            </p>
          </section>
        </>
      )}

      <section className="card">
        <h2>This Month</h2>
        <p className="sub">{formatHoursMinutes(monthTotalMinutes)} reclaimed, by what you did with it.</p>
        {monthTotalMinutes === 0 ? (
          <p className="empty">Nothing logged yet — reflections appear here after you tell us what you did with reclaimed time.</p>
        ) : (
          REFLECTION_CATEGORIES.filter((c) => monthTotals[c.id]).map((c) => (
            <div className="category-bar-row" key={c.id}>
              <span className="name">{categoryLabel(c.id)}</span>
              <span className="track">
                <ProgressBar progress={monthTotals[c.id] / maxCategoryMinutes} />
              </span>
              <span className="amount">{formatHoursMinutes(monthTotals[c.id])}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
