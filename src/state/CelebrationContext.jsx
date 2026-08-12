// CelebrationContext.jsx
//
// One shared "reward moment" overlay for the whole app, instead of every
// screen building its own. Two ways events get in here:
//   1. Automatic — this provider watches derived level/achievements and
//      fires a celebration the moment either changes DURING THE SESSION
//      (a ref baseline captured on mount means already-unlocked stuff from
//      a previous visit never re-celebrates on reload).
//   2. Manual — any screen can call `celebrate({ icon, title, subtitle })`
//      via useCelebration() for an immediate action's reward (finishing a
//      focus session, completing a challenge).
// Events queue and show one at a time so two things unlocking at once
// doesn't stack overlays.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAppState } from "./AppStateContext";
import Celebration from "../components/Celebration";

const CelebrationCtx = createContext(null);

export function CelebrationProvider({ children }) {
  const { derived } = useAppState();
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const dismissTimer = useRef(null);

  const seenLevel = useRef(null);
  const seenAchievementIds = useRef(null);

  function celebrate(event) {
    setQueue((q) => [...q, { id: `${Date.now()}:${Math.random()}`, ...event }]);
  }

  // Auto-detect level ups.
  useEffect(() => {
    const level = derived.level.level;
    if (seenLevel.current === null) {
      seenLevel.current = level;
      return;
    }
    if (level > seenLevel.current) {
      celebrate({ icon: "⤴", title: `Level ${level}`, subtitle: derived.level.title, tone: "level" });
    }
    seenLevel.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived.level.level]);

  // Auto-detect new achievement unlocks.
  useEffect(() => {
    const unlockedIds = derived.achievements.filter((a) => a.unlocked).map((a) => a.id);
    if (seenAchievementIds.current === null) {
      seenAchievementIds.current = new Set(unlockedIds);
      return;
    }
    const fresh = unlockedIds.filter((id) => !seenAchievementIds.current.has(id));
    for (const id of fresh) {
      const achievement = derived.achievements.find((a) => a.id === id);
      celebrate({ icon: "🏆", title: "Achievement unlocked", subtitle: achievement?.title, tone: "achievement" });
    }
    seenAchievementIds.current = new Set(unlockedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived.achievements]);

  // Advance the queue.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return undefined;
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setCurrent(null), 2600);
    return () => clearTimeout(dismissTimer.current);
  }, [current]);

  return (
    <CelebrationCtx.Provider value={{ celebrate }}>
      {children}
      <Celebration event={current} onDismiss={() => setCurrent(null)} />
    </CelebrationCtx.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationCtx);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}
