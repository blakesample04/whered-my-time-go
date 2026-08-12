import { useEffect, useRef, useState } from "react";
import { formatHoursMinutes } from "../lib/timeTranslator";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Renders a minutes value as "Xh Ym", counting up/down smoothly whenever
 * it changes — this is what makes Time Bank and Time Reclaimed feel like
 * they're actually growing rather than just re-rendering. Skips the
 * animation entirely under prefers-reduced-motion.
 */
export default function AnimatedMinutes({ minutes, className, as: Tag = "span" }) {
  const [display, setDisplay] = useState(minutes);
  const fromRef = useRef(minutes);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = minutes;
    if (from === to) return undefined;

    if (prefersReducedMotion()) {
      setDisplay(to);
      fromRef.current = to;
      return undefined;
    }

    const duration = Math.min(900, Math.max(350, Math.abs(to - from) * 6));
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const value = from + (to - from) * ease(t);
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minutes]);

  return <Tag className={className ? `num ${className}` : "num"}>{formatHoursMinutes(Math.round(display))}</Tag>;
}
