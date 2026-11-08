"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** Pixels per second; the duration scales with content so speed stays the same for any number of items. */
const SPEED = 45;

/**
 * Endless, smooth right-to-left scroll. The items are rendered twice and the
 * track slides by exactly one copy, so the loop has no visible jump. If every
 * item already fits, it stays still. Pauses on hover and keyboard focus; with
 * reduced motion it becomes a normal swipeable row instead.
 */
export function Marquee({
  label,
  itemClassName,
  children,
}: {
  /** Accessible name, e.g. "Servers". */
  label: string;
  /**
   * Width of each item in container units, e.g. "w-[calc(100cqw/2)] md:w-[calc(100cqw/4)]".
   * Each item carries its own right padding as the gap, which keeps the loop seamless.
   */
  itemClassName: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLUListElement>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const items = Children.toArray(children);

  useEffect(() => {
    const container = containerRef.current;
    const copy = copyRef.current;
    if (!container || !copy) return;
    const measure = () => {
      const overflow = copy.scrollWidth > container.clientWidth + 1;
      setDuration(overflow ? copy.scrollWidth / SPEED : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [items.length]);

  const moving = duration !== null;
  const renderCopy = (copyIndex: number) => (
    <ul
      ref={copyIndex === 0 ? copyRef : undefined}
      aria-hidden={copyIndex > 0 || undefined}
      // The duplicate is for looks only, so it is skipped by keyboard and screen readers.
      inert={copyIndex > 0 || undefined}
      className="flex shrink-0"
    >
      {items.map((item, index) => (
        <li key={index} className={`flex shrink-0 pr-3 ${itemClassName}`}>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    // Centered only while still; when moving, the track must start at the left edge to loop cleanly.
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      className={`marquee @container overflow-hidden py-1 ${moving ? "" : "flex justify-center"}`}
    >
      <div
        className={`flex w-max ${moving ? "marquee-track" : ""}`}
        style={moving ? { animationDuration: `${duration}s` } : undefined}
      >
        {renderCopy(0)}
        {moving && renderCopy(1)}
      </div>
    </div>
  );
}
