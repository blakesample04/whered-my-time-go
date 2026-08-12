export default function Celebration({ event, onDismiss }) {
  if (!event) return null;
  return (
    <div className="celebration-backdrop" onClick={onDismiss} role="status" aria-live="polite">
      <div className="celebration-card" data-tone={event.tone || "default"}>
        <div className="celebration-burst" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ "--i": i }} />
          ))}
        </div>
        <div className="celebration-icon">{event.icon || "✨"}</div>
        <div className="celebration-title">{event.title}</div>
        {event.subtitle && <div className="celebration-subtitle">{event.subtitle}</div>}
      </div>
    </div>
  );
}
