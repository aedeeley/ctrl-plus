import { useEffect, useRef, useState } from "react";
import type { ClipboardItem } from "../types";

interface ClipboardListProps {
  items: ClipboardItem[];
  selectedIndex: number;
  hoveredIndex: number | null;
  showShortcuts: boolean;
  maxShortcuts: number;
  isPro: boolean;
  canReorder: boolean;
  onHoverIndexChange: (index: number | null) => void;
  onSelect: (index: number) => void;
  onPaste: (item: ClipboardItem) => void;
  onTogglePin: (item: ClipboardItem) => void;
  onReorder: (orderedIds: number[]) => void;
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

function reorderIds(items: ClipboardItem[], fromIndex: number, toIndex: number) {
  const next = items.map((item) => item.id);
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function DragHandleIcon() {
  return (
    <svg
      className="item-drag-icon"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="1.25" />
      <circle cx="7" cy="3" r="1.25" />
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="7" cy="8" r="1.25" />
      <circle cx="3" cy="13" r="1.25" />
      <circle cx="7" cy="13" r="1.25" />
    </svg>
  );
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`item-pin-icon${filled ? " is-pinned" : ""}`}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle className="item-pin-head" cx="6" cy="3" r="2" />
      <path className="item-pin-needle" d="M6 5v5" />
    </svg>
  );
}

export function ClipboardList({
  items,
  selectedIndex,
  hoveredIndex,
  showShortcuts,
  maxShortcuts,
  isPro,
  canReorder,
  onHoverIndexChange,
  onSelect,
  onPaste,
  onTogglePin,
  onReorder,
}: ClipboardListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const dragSourceRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeIndex = hoveredIndex ?? selectedIndex;

  const findRowIndexAtY = (clientY: number, sourceIndex: number) => {
    const sourcePinned = items[sourceIndex]?.pinned;
    if (sourcePinned === undefined) {
      return null;
    }

    for (let index = 0; index < items.length; index += 1) {
      if (items[index].pinned !== sourcePinned) {
        continue;
      }

      const element = itemRefs.current.get(index);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (clientY >= rect.top && clientY < rect.bottom) {
        return index;
      }
    }

    return null;
  };

  const updateDragOver = (index: number | null) => {
    dragOverRef.current = index;
    setDragOverIndex(index);
  };

  const endDrag = () => {
    dragSourceRef.current = null;
    updateDragOver(null);
    setDragIndex(null);
  };

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

  const handleDragHandlePointerDown = (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!canReorder || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragSourceRef.current = index;
    setDragIndex(index);
    updateDragOver(index);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragHandlePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (dragSourceRef.current === null) {
      return;
    }

    const targetIndex = findRowIndexAtY(event.clientY, dragSourceRef.current);
    if (targetIndex !== null) {
      updateDragOver(targetIndex);
    }
  };

  const handleDragHandlePointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (dragSourceRef.current === null) {
      return;
    }

    const fromIndex = dragSourceRef.current;
    const toIndex = dragOverRef.current ?? fromIndex;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    endDrag();

    if (
      fromIndex !== toIndex &&
      items[fromIndex] &&
      items[toIndex] &&
      items[fromIndex].pinned === items[toIndex].pinned
    ) {
      onReorder(reorderIds(items, fromIndex, toIndex));
    }
  };

  const handleDragHandlePointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

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
      className={`clipboard-list-viewport${dragIndex !== null ? " is-dragging" : ""}`}
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
          const isActive = index === activeIndex;
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index && dragIndex !== index;

          return (
            <div
              key={item.id}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(index, node);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              className={[
                "clipboard-item",
                isActive ? "active" : "",
                item.pinned ? "pinned" : "",
                isDragging ? "dragging" : "",
                isDragOver ? "drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => onHoverIndexChange(index)}
            >
              {canReorder ? (
                <button
                  type="button"
                  className="item-drag-handle"
                  aria-label="Drag to reorder"
                  onPointerDown={(event) =>
                    handleDragHandlePointerDown(index, event)
                  }
                  onPointerMove={handleDragHandlePointerMove}
                  onPointerUp={handleDragHandlePointerUp}
                  onPointerCancel={handleDragHandlePointerCancel}
                  onClick={(event) => event.stopPropagation()}
                >
                  <DragHandleIcon />
                </button>
              ) : null}

              <button
                type="button"
                className="clipboard-item-body"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(index);
                  onPaste(item);
                }}
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

              {isPro ? (
                <button
                  type="button"
                  className={`item-pin-button${item.pinned ? " pinned" : ""}`}
                  aria-label={item.pinned ? "Unpin clip" : "Pin clip"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePin(item);
                  }}
                >
                  <PinIcon filled={item.pinned} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
