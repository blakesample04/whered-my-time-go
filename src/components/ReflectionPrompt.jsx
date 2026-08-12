import Modal from "./Modal";
import { REFLECTION_CATEGORIES } from "../lib/reflections";
import { formatHoursMinutes } from "../lib/timeTranslator";

export default function ReflectionPrompt({ open, onClose, minutes, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title="What did you do with it?">
      <p className="sub">
        You reclaimed {formatHoursMinutes(minutes)} today. However you spent it counts.
      </p>
      <div className="reflection-grid">
        {REFLECTION_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className="reflection-chip"
            onClick={() => {
              onPick(c.id);
              onClose();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
