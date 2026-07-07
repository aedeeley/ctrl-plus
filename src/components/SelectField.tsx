import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = options.length * 38 + 10;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const shouldOpenUp =
      spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    setOpenUp(shouldOpenUp);
    setMenuPosition({
      left: rect.left,
      width: rect.width,
      top: shouldOpenUp ? rect.top - 4 : rect.bottom + 4,
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const onLayoutChange = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, options.length]);

  return (
    <div className="select-field" ref={rootRef}>
      <span className="select-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) {
              window.requestAnimationFrame(updateMenuPosition);
            }
            return next;
          });
        }}
      >
        <span>{selected?.label ?? String(value)}</span>
        <svg
          className={`select-chevron ${open ? "open" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className={`select-menu select-menu-floating ${openUp ? "open-up" : ""}`}
            role="listbox"
            style={{
              left: menuPosition.left,
              width: menuPosition.width,
              top: menuPosition.top,
            }}
          >
            {options.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`select-option ${option.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          rootRef.current?.closest(".overlay-card") ?? document.body,
        )}
    </div>
  );
}
