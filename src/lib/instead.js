// instead.js
//
// "What could you have done instead?" — translates a block of passive time
// into concrete alternatives. Goal-aware when possible (prioritizes the
// user's actual goal), otherwise falls back to a generic, honest set of
// equivalents. Deliberately not framed as a judgment — see the copy: this
// exists to make time tangible, not to shame anyone for how they spent it.

const READING_MINUTES_PER_PAGE = 2; // a commonly-cited casual reading pace
const DEFAULT_SESSION_MINUTES = 30; // fallback when there's no session history yet

export function suggestInstead(minutes, { activeGoal, avgGoalSessionMinutes } = {}) {
  if (minutes < 10) return [];

  const suggestions = [];
  const sessionLength = avgGoalSessionMinutes && avgGoalSessionMinutes >= 5 ? avgGoalSessionMinutes : DEFAULT_SESSION_MINUTES;

  if (activeGoal) {
    const sessions = Math.floor(minutes / sessionLength);
    if (sessions >= 1) {
      suggestions.push(`Practiced "${activeGoal.title}" for ${sessions} session${sessions === 1 ? "" : "s"}`);
    }
    const nextUndone = activeGoal.steps.find((s) => !s.done);
    if (nextUndone && minutes >= 15) {
      suggestions.push(`Made real progress on "${nextUndone.text}"`);
    }
  }

  const pages = Math.round(minutes / READING_MINUTES_PER_PAGE);
  if (pages >= 10) suggestions.push(`Read about ${pages} pages`);

  if (minutes >= 20) suggestions.push("Gone for a walk and gotten some air");
  if (minutes >= 30) suggestions.push("Done a full workout");
  if (minutes >= 45) suggestions.push("Cooked a real meal instead of grabbing something fast");
  if (minutes >= 60) suggestions.push("Edited a video or finished a creative project piece");
  if (minutes >= 30) suggestions.push("Called or spent real time with someone you care about");

  return suggestions.slice(0, 6);
}
