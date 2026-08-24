import { useRef } from "react";

export function useIdempotencyKey() {
  const counter = useRef(0);

  return () => {
    counter.current += 1;
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `idem-${ts}-${rand}-${counter.current}`;
  };
}
