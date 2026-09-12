import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, children }) {
  // In the Android TWA wrapper, the hardware/gesture back button fires
  // browser "back" — without this, it would navigate the underlying screen
  // away entirely while a sheet is open, instead of just closing the sheet
  // (the behavior users actually expect, and the only option on iOS/web
  // since there's no hardware back there). Pushing one history entry per
  // open lets us treat back-while-open as "close", and popping that same
  // entry when the sheet closes any other way (X button, backdrop tap,
  // picking an option) keeps the history stack from accumulating dead
  // entries.
  const poppedRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    poppedRef.current = false;
    window.history.pushState({ modal: true }, "");
    function handlePopState() {
      poppedRef.current = true;
      onClose();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!poppedRef.current) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
