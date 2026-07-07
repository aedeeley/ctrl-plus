import { useEffect, useRef, useState } from "react";
import type { ClipboardItem } from "../types";

interface ClipboardListProps {
  items: ClipboardItem[];
  selectedIndex: number;
  hoveredIndex: number | null;
  showShortcuts: boolean;
  maxShortcuts: number;
  onHoverIndexChange: (index: number | null) => void;
  onSelect: (index: number) => void;
  onPaste: (item: ClipboardItem) => void;
}

export function shortcutLabelForIndex(
  index: number,
  maxShortcuts = 9,
): string | null {
  if (index < 0 || index >= maxShortcuts) {
    return null;
  }
  return String(index + 1);
}

export function shortcutIndexForKey(key: string): number | null {
  if (key >= "1" && key <= "9") {
    return Number(key) - 1;
  }
  return null;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewText(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 120) {
    return singleLine;
  }
  return `${singleLine.slice(0, 117)}...`;
}

export function ClipboardList({
  items,
  selectedIndex,
  hoveredIndex,
  showShortcuts,
  maxShortcuts,
  onHoverIndexChange,
  onSelect,
  onPaste,
}: ClipboardListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const [scrollTop, setScrollTop] = useState(0);

  const activeIndex = hoveredIndex ?? selectedIndex;

  useEffect(() => {
    setScrollTop(0);
  }, [items]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const active = itemRefs.current.get(activeIndex);
    if (!viewport || !active) {
      return;
    }

    setScrollTop((current) => {
      const itemTop = active.offsetTop;
      const itemBottom = itemTop + active.offsetHeight;
      const viewTop = current;
      const viewBottom = current + viewport.clientHeight;

      if (itemTop < viewTop) {
        return itemTop;
      }
      if (itemBottom > viewBottom) {
        return itemBottom - viewport.clientHeight;
      }
      return current;
    });
  }, [activeIndex, items.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (items.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onHoverIndexChange(null);

      const direction = event.deltaY > 0 ? 1 : -1;
      onSelect(
        Math.min(items.length - 1, Math.max(0, selectedIndex + direction)),
      );
    };

    viewport.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => viewport.removeEventListener("wheel", onWheel, { capture: true });
  }, [items.length, onHoverIndexChange, onSelect, selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>No clipboard history yet.</p>
        <span>Copy some text and it will appear here.</span>
      </div>
    );
  }

  return (
    <div
      className="clipboard-list-viewport"
      ref={viewportRef}
      onMouseLeave={() => onHoverIndexChange(null)}
    >
      <div
        className="clipboard-list-inner"
        ref={innerRef}
        style={{ transform: `translateY(-${scrollTop}px)` }}
      >
        {items.map((item, index) => {
          const shortcutLabel = showShortcuts
            ? shortcutLabelForIndex(index, maxShortcuts)
            : null;

          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(index, node);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              type="button"
              className={`clipboard-item ${index === activeIndex ? "active" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(index);
                onPaste(item);
              }}
              onMouseEnter={() => onHoverIndexChange(index)}
            >
              {shortcutLabel ? (
                <span className="item-shortcut" aria-hidden="true">
                  {shortcutLabel}
                </span>
              ) : null}
              <span className="item-preview" title={formatTime(item.createdAt)}>
                {previewText(item.content)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
