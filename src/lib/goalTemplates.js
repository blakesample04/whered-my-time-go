// goalTemplates.js
//
// Static, curated starter steps per goal category — a scaffold to react to
// ("keep this / drop this / add your own"), not a claim of personalized
// expertise. Kept intentionally generic and honest about that in the UI copy.

export const GOAL_STEP_TEMPLATES = {
  learn: [
    "Pick one resource to start with — a book, course, or app",
    "Block 20 minutes, three times this week, to practice",
    "Do something small toward it every day for a week",
  ],
  school: [
    "List your top 3 priorities for this week",
    "Block a daily study session on your calendar",
    "Review what you learned each Friday",
  ],
  exercise: [
    "Pick 3 days this week you'll actually move",
    "Choose one activity you don't dread",
    "Do a 10-minute session today — just start",
  ],
  create: [
    "Decide exactly what you're making",
    "Set aside one dedicated block of time this week",
    "Finish one small piece, even if it's rough",
  ],
  work: [
    "Write down your top 3 priorities",
    "Block real focus time on your calendar",
    "Finish one meaningful task before you check your phone",
  ],
  people: [
    "Message one person you've been meaning to reach out to",
    "Plan one hangout or call this week",
    "Put your phone away during one shared meal",
  ],
  outside: [
    "Pick a time of day you'll realistically go",
    "Start with 10 minutes outside, no destination needed",
    "Try a new route or place nearby",
  ],
  rest: [
    "Pick one night this week for an earlier wind-down",
    "Try 10 screen-free minutes before bed",
    "Notice how you feel after one full rest day",
  ],
  project: [
    "Write down what 'done' looks like",
    "Break it into one small next action",
    "Block time this week to just start",
  ],
  other: [
    "Write down what success looks like",
    "Pick one small first step",
    "Set aside time this week to begin",
  ],
};

export function templateStepsFor(category) {
  return GOAL_STEP_TEMPLATES[category] || GOAL_STEP_TEMPLATES.other;
}
