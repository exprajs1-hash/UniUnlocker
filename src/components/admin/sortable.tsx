"use client";

import { GripVertical } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

/**
 * A list the admin reorders by dragging the ⋮⋮ handle, with mouse or touch
 * (pointer events), or from the keyboard: focus a handle and press ↑/↓.
 * `onCommit` gets the new order once, when the item is dropped.
 */
export function SortableList<T extends { id: string }>({
  items,
  onCommit,
  label,
  className = "",
  itemClassName,
  children,
}: {
  items: T[];
  onCommit: (next: T[]) => void;
  /** Name of an item for screen readers, e.g. the tool name. */
  label: (item: T) => string;
  className?: string;
  itemClassName?: (item: T) => string;
  /** Renders one row; put `handle` where the drag grip should go. */
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  const [preview, setPreview] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const orderRef = useRef<T[]>(items);
  const list = preview ?? items;

  function reorder(base: T[], id: string, target: number): T[] {
    const from = base.findIndex((item) => item.id === id);
    if (from < 0 || from === target) return base;
    const next = [...base];
    const [moved] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(target, next.length)), 0, moved);
    return next;
  }

  return (
    <ul ref={listRef} className={className}>
      {list.map((item) => {
        const dragging = draggingId === item.id;
        const handle = (
          <button
            type="button"
            data-sort-handle=""
            aria-label={`Drag to move ${label(item)} (or press up/down)`}
            title="Drag to move"
            className={`admin-icon-btn cursor-grab touch-none active:cursor-grabbing ${dragging ? "text-primary" : ""}`}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              const grip = event.currentTarget;
              grip.setPointerCapture(event.pointerId);
              const original = items;
              orderRef.current = items;
              setDraggingId(item.id);

              const onMove = (move: PointerEvent) => {
                const rows = [...(listRef.current?.querySelectorAll<HTMLElement>(":scope > [data-sort-id]") ?? [])];
                // The first row whose middle is below the pointer is where the item goes.
                let target = rows.length - 1;
                for (let index = 0; index < rows.length; index++) {
                  const rect = rows[index].getBoundingClientRect();
                  if (move.clientY < rect.top + rect.height / 2) {
                    target = index;
                    break;
                  }
                }
                orderRef.current = reorder(orderRef.current, item.id, target);
                setPreview(orderRef.current);
                // Scroll the page when dragging near the top or bottom edge.
                if (move.clientY < 60) window.scrollBy(0, -12);
                else if (move.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
              };
              const onUp = () => {
                grip.removeEventListener("pointermove", onMove);
                grip.removeEventListener("pointerup", onUp);
                grip.removeEventListener("pointercancel", onUp);
                const next = orderRef.current;
                setDraggingId(null);
                setPreview(null);
                if (next.some((entry, index) => entry.id !== original[index]?.id)) onCommit(next);
              };
              grip.addEventListener("pointermove", onMove);
              grip.addEventListener("pointerup", onUp);
              grip.addEventListener("pointercancel", onUp);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              const index = items.findIndex((entry) => entry.id === item.id);
              const target = index + (event.key === "ArrowUp" ? -1 : 1);
              if (target < 0 || target >= items.length) return;
              onCommit(reorder(items, item.id, target));
              // Keep focus on this item's handle after the list re-renders.
              requestAnimationFrame(() =>
                listRef.current?.querySelector<HTMLButtonElement>(`[data-sort-id="${item.id}"] [data-sort-handle]`)?.focus(),
              );
            }}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        );
        return (
          <li
            key={item.id}
            data-sort-id={item.id}
            className={`${itemClassName?.(item) ?? ""} ${dragging ? "relative z-10 shadow-lg ring-2 ring-primary/60" : ""}`}
          >
            {children(item, handle)}
          </li>
        );
      })}
    </ul>
  );
}
