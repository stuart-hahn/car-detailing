import { useEffect, useState } from "react";

export type ChecklistCompleteMode = "swipe" | "checkbox";

/** Touch-primary devices use swipe; mouse / trackpad use checkbox. */
export function detectChecklistCompleteMode(
  coarsePointer: boolean,
): ChecklistCompleteMode {
  return coarsePointer ? "swipe" : "checkbox";
}

function detectMode(): ChecklistCompleteMode {
  if (typeof window === "undefined") return "checkbox";
  return detectChecklistCompleteMode(
    window.matchMedia("(pointer: coarse)").matches,
  );
}

export function useChecklistCompleteMode(): ChecklistCompleteMode {
  const [mode, setMode] = useState<ChecklistCompleteMode>(detectMode);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setMode(mq.matches ? "swipe" : "checkbox");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mode;
}
