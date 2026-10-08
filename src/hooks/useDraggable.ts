import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelPosition } from "../types";

/**
 * Makes an element draggable by its header, constrained to the viewport
 * so the panel never triggers page scrollbars.
 */
export function useDraggable(initial: PanelPosition) {
  const [position, setPosition] = useState<PanelPosition>(initial);
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragState.current = {
        offsetX: e.clientX - position.x,
        offsetY: e.clientY - position.y,
      };
      setIsDragging(true);
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const maxX = window.innerWidth - 40;
      const maxY = window.innerHeight - 40;
      const nextX = Math.min(Math.max(0, e.clientX - dragState.current.offsetX), maxX);
      const nextY = Math.min(Math.max(0, e.clientY - dragState.current.offsetY), maxY);
      setPosition({ x: nextX, y: nextY });
    };

    const onUp = () => {
      dragState.current = null;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  return { position, isDragging, onHeaderMouseDown };
}
