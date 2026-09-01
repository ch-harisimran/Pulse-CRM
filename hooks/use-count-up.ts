"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export function useCountUp(target: number, opts?: { duration?: number; decimals?: number }) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const controls = animate(prevTarget.current, target, {
      duration: opts?.duration ?? 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    prevTarget.current = target;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const decimals = opts?.decimals ?? 0;
  return Number(value.toFixed(decimals));
}
