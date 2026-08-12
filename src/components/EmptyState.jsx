export default function EmptyState({ icon = "✨", title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {body && <p className="empty-state-body">{body}</p>}
      {action}
    </div>
  );
}
