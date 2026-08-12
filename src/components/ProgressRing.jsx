const CLAMP = (n) => Math.max(0, Math.min(1, n));

/**
 * A circular progress indicator with a gradient stroke. Used anywhere a
 * ring communicates "how far along" something is — Home's daily progress,
 * the Focus timer, the level ring — so the visual language for "progress"
 * stays consistent across the app instead of every screen inventing its
 * own bar/circle.
 */
export default function ProgressRing({
  progress,
  size = 220,
  stroke = 14,
  gradientId = "ringGradient",
  trackColor = "var(--border)",
  children,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - CLAMP(progress));

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-ring-arc"
        />
      </svg>
      <div className="progress-ring-content">{children}</div>
    </div>
  );
}
