import { useCallback, useEffect, useState } from "react";

export function useCapsLock() {
  const [isCapsLock, setIsCapsLock] = useState(false);

  const handleKeyDown = useCallback((event) => {
    if (event.getModifierState) {
      setIsCapsLock(event.getModifierState("CapsLock"));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyDown);
    };
  }, [handleKeyDown]);

  return isCapsLock;
}
