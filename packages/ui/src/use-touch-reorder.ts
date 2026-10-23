import { useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { canReorderElement } from "@react-fabrio/core";
import type { DesignElement } from "@react-fabrio/core";

type TouchDrop = { key: string; position: "before" | "after"; index: number };
/** Several mobile browsers do not support native HTML dragging with touch. */
export const useTouchReorder = (
  list: RefObject<HTMLDivElement | null>,
  layers: DesignElement[],
  busy: boolean,
  move: (id: string, index: number) => void,
) => {
  const gesture = useRef<{
    id: string;
    pointerId: number;
    y: number;
    startY: number;
    active: boolean;
    drop: TouchDrop | null;
  } | null>(null);
  const frame = useRef(0);
  const [touchId, setTouchId] = useState<string | null>(null);
  const [drop, setDrop] = useState<TouchDrop | null>(null);
  const cancel = () => {
    cancelAnimationFrame(frame.current);
    gesture.current = null;
    setTouchId(null);
    setDrop(null);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const locate = () => {
    const current = gesture.current;
    const container = list.current;
    if (!current?.active || !container) return;
    const bounds = container.getBoundingClientRect();
    const y = Math.max(bounds.top, Math.min(bounds.bottom, current.y));
    const speed = y < bounds.top + 32 ? -8 : y > bounds.bottom - 32 ? 8 : 0;
    container.scrollBy(0, speed);
    const rows = [...container.querySelectorAll<HTMLElement>(".rf-layer-row")];
    const row = rows.find((item) => item.getBoundingClientRect().bottom >= y) ?? rows.at(-1);
    let next: TouchDrop | null = null;
    if (row) {
      const box = row.getBoundingClientRect();
      const key = row.dataset.key!;
      const position = y < box.top + box.height / 2 ? "before" : "after";
      const from = layers.findIndex((e) => e.id === current.id);
      const gap = layers.findIndex((e) => e.id === key) + (position === "before" ? 1 : 0);
      const index = gap - (from < gap ? 1 : 0);
      if (canReorderElement(layers, current.id, index)) next = { key, position, index };
    }
    current.drop = next;
    setDrop((previous) => {
      if (previous && next && previous.key === next.key && previous.position === next.position)
        return previous;
      return next;
    });
    frame.current = requestAnimationFrame(locate);
  };
  return {
    touchId,
    touchDrop: drop,
    onPointerDownCapture(event: PointerEvent<HTMLElement>) {
      if (busy || event.pointerType !== "touch") return;
      const target = event.target as HTMLElement;
      const handle = target.closest(".rf-layer-handle:not([disabled])");
      const id = handle?.closest<HTMLElement>("[data-key]")?.dataset.key;
      if (!id) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = {
        id,
        pointerId: event.pointerId,
        y: event.clientY,
        startY: event.clientY,
        active: false,
        drop: null,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.y = event.clientY;
      if (!current.active && Math.abs(current.y - current.startY) > 6) {
        current.active = true;
        setTouchId(current.id);
        locate();
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const { id, drop: target, active } = current;
      cancel();
      if (active && target) move(id, target.index);
      requestAnimationFrame(() =>
        list.current
          ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(id)}"] [slot="drag"]`)
          ?.focus(),
      );
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onKeyDownCapture(event: import("react").KeyboardEvent<HTMLElement>) {
      if (event.key === "Escape" && gesture.current) {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    },
  };
};
