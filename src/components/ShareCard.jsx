import { forwardRef } from "react";

/**
 * The visual "screenshot-worthy" card for milestone moments — weekly
 * recap, lifetime Time Bank, level, streak. Kept as a standalone,
 * self-contained component (own gradient background, own wordmark) since
 * it's designed to be captured as an image via html2canvas in ShareModal,
 * not just displayed inline.
 */
const ShareCard = forwardRef(function ShareCard({ eyebrow, big, sub, stats }, ref) {
  return (
    <div className="share-card" ref={ref}>
      <div className="share-card-glow" aria-hidden="true" />
      <div className="share-card-eyebrow">{eyebrow}</div>
      <div className="share-card-big num">{big}</div>
      {sub && <div className="share-card-sub">{sub}</div>}
      {stats && stats.length > 0 && (
        <div className="share-card-stats">
          {stats.map((s) => (
            <div className="share-card-stat" key={s.label}>
              <div className="v num">{s.value}</div>
              <div className="k">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="share-card-brand">Where'd my time go?</div>
    </div>
  );
});

export default ShareCard;
