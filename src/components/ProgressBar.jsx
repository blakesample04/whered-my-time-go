export default function ProgressBar({ progress, color = "var(--accent)" }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
