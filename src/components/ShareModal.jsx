import { useRef, useState } from "react";
import Modal from "./Modal";
import ShareCard from "./ShareCard";

export default function ShareModal({ open, onClose, eyebrow, big, sub, stats, shareText, filename = "reclaimed-time" }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  async function saveImage() {
    setStatus("saving");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: Math.min(3, window.devicePixelRatio || 2),
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          setStatus("error");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      });
    } catch {
      setStatus("error");
    }
  }

  function shareOrCopy() {
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 2000);
      }).catch(() => {});
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share">
      <div className="share-card-frame">
        <ShareCard ref={cardRef} eyebrow={eyebrow} big={big} sub={sub} stats={stats} />
      </div>
      <div className="form-row" style={{ marginTop: 16 }}>
        <button className="primary" onClick={saveImage} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Try again" : "Save image"}
        </button>
        <button className="secondary" onClick={shareOrCopy}>
          {status === "copied" ? "Copied ✓" : "Share text"}
        </button>
      </div>
    </Modal>
  );
}
