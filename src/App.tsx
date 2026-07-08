import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ClipboardList,
  shortcutIndexForKey,
} from "./components/ClipboardList";
import { Settings } from "./components/Settings";
import { applyAppearance, getSystemPreferredTheme, normalizeBorder, normalizeFont, normalizeShadow, normalizeTheme } from "./themes";
import { FREE_MAX_HISTORY, type AppSettings, type ClipboardItem, type LicenseStatus } from "./types";
import "./App.css";

function formatOpenMs(ms: number): string {
  if (ms < 100) {
    return `${ms.toFixed(1)} ms`;
  }
  return `${Math.round(ms)} ms`;
}

function App() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [license, setLicense] = useState<LicenseStatus>({ tier: "free" });
  const [showSettings, setShowSettings] = useState(false);
  const [openMs, setOpenMs] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const overlayCardRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return items;
    }
    return items.filter((item) =>
      item.content.toLowerCase().includes(trimmed),
    );
  }, [items, query]);

  const loadHistory = useCallback(async () => {
    const history = await invoke<ClipboardItem[]>("get_history");
    setItems(history);
    setSelectedIndex(0);
  }, []);

  const loadSettings = useCallback(async () => {
    const nextSettings = await invoke<AppSettings>("get_settings");
    setSettings({
      ...nextSettings,
      theme: normalizeTheme(nextSettings.theme),
      borderStyle: normalizeBorder(nextSettings.borderStyle),
      fontStyle: normalizeFont(nextSettings.fontStyle),
      shadowStyle: normalizeShadow(nextSettings.shadowStyle),
    });
  }, []);

  const loadLicense = useCallback(async () => {
    const status = await invoke<LicenseStatus>("get_license_status");
    setLicense(status);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadHistory(), loadSettings(), loadLicense()]);
  }, [loadHistory, loadSettings, loadLicense]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      void invoke<LicenseStatus>("unlock_dev_pro")
        .then(setLicense)
        .then(() => refresh())
        .catch(() => {
          void refresh();
        });
      return;
    }

    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!settings || !overlayCardRef.current) {
      return;
    }

    applyAppearance(
      overlayCardRef.current,
      settings.theme,
      settings.borderStyle,
      settings.fontStyle,
      settings.shadowStyle,
    );
  }, [settings]);

  useEffect(() => {
    const unlisteners = Promise.all([
      listen("clipboard-updated", () => {
        void loadHistory();
      }),
      listen("overlay-shown", (event) => {
        const backendMs =
          typeof event.payload === "object" &&
          event.payload !== null &&
          "backend_ms" in event.payload
            ? Number((event.payload as { backend_ms: number }).backend_ms)
            : 0;
        const paintStarted = performance.now();

        setQuery("");
        setSelectedIndex(0);
        setHoveredIndex(null);
        setShowSettings(false);

        requestAnimationFrame(() => {
          setOpenMs(backendMs + performance.now() - paintStarted);
          searchRef.current?.focus();
        });
      }),
      listen("open-settings", () => {
        setShowSettings(true);
      }),
      listen("license-updated", (event) => {
        setLicense(event.payload as LicenseStatus);
        void loadSettings();
        void loadHistory();
      }),
    ]);

    return () => {
      void unlisteners.then((handles) => {
        handles.forEach((handle) => handle());
      });
    };
  }, [loadHistory, loadSettings]);

  const pasteItem = useCallback(async (item: ClipboardItem) => {
    await invoke("paste_item", { id: item.id });
  }, []);

  const hideOverlay = useCallback(async () => {
    await invoke("hide_overlay");
  }, []);

  const endWindowDrag = useCallback(() => {
    void invoke("end_window_drag");
  }, []);

  const startWindowDrag = useCallback(() => {
    void invoke("start_window_drag");
  }, []);

  const recenterWindow = useCallback(() => {
    void invoke("reset_window_position");
  }, []);

  const saveSettings = useCallback(async (nextSettings: AppSettings) => {
    const saved = await invoke<AppSettings>("update_settings", {
      settings: nextSettings,
    });
    setSettings({
      ...saved,
      theme: normalizeTheme(saved.theme),
      borderStyle: normalizeBorder(saved.borderStyle),
      fontStyle: normalizeFont(saved.fontStyle),
      shadowStyle: normalizeShadow(saved.shadowStyle),
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await invoke("clear_history");
    await loadHistory();
  }, [loadHistory]);

  const handleTogglePin = useCallback(
    async (item: ClipboardItem) => {
      try {
        await invoke("toggle_pin", { id: item.id });
        await loadHistory();
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    },
    [loadHistory],
  );

  const handleReorder = useCallback(
    async (orderedIds: number[]) => {
      setItems((current) => {
        const byId = new Map(current.map((entry) => [entry.id, entry]));
        return orderedIds
          .map((id) => byId.get(id))
          .filter((entry): entry is ClipboardItem => entry !== undefined);
      });
      await invoke("reorder_items", { orderedIds });
      await loadHistory();
    },
    [loadHistory],
  );

  const activeIndex = hoveredIndex ?? selectedIndex;

  const pasteActiveItem = useCallback(() => {
    const item = filteredItems[activeIndex];
    if (item) {
      void pasteItem(item);
    }
  }, [activeIndex, filteredItems, pasteItem]);

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (showSettings || event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("button, input, select, textarea, a, label, .select-menu, .select-field, .item-drag-handle, .item-pin-button")) {
        return;
      }

      pasteActiveItem();
    },
    [pasteActiveItem, showSettings],
  );

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) {
      if (event.key === "Escape") {
        event.preventDefault();
        void hideOverlay();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHoveredIndex(null);
      setSelectedIndex((index) =>
        Math.min(index + 1, filteredItems.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHoveredIndex(null);
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = filteredItems[activeIndex];
      if (item) {
        void pasteItem(item);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (showSettings) {
        setShowSettings(false);
      } else {
        void hideOverlay();
      }
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
    setHoveredIndex(null);
  }, [query]);

  const searchIsEmpty = query.trim() === "";
  const isPro = license.tier === "pro";
  const maxShortcuts = isPro ? 9 : FREE_MAX_HISTORY;
  const pasteShortcutHint = isPro ? "1-9 hotkey" : "1-5 hotkey";

  useEffect(() => {
    if (showSettings || !searchIsEmpty) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const index = shortcutIndexForKey(event.key);
      if (index === null || index >= maxShortcuts || index >= filteredItems.length) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void pasteItem(filteredItems[index]);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [showSettings, searchIsEmpty, maxShortcuts, filteredItems, pasteItem]);

  useEffect(() => {
    if (showSettings) {
      return;
    }

    const timer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [showSettings]);

  const bootTheme = getSystemPreferredTheme();

  if (!settings) {
    return (
      <main className="overlay-shell">
        <div
          className="overlay-card loading-card"
          data-theme={bootTheme}
          data-border="rounded"
          data-font="system"
          data-shadow="medium"
        >
          <p>Loading ctrl+...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="overlay-shell">
      <div
        className={`overlay-card${showSettings ? " settings-mode" : ""}`}
        ref={overlayCardRef}
        data-theme={settings.theme}
        data-border={settings.borderStyle}
        data-font={settings.fontStyle}
        data-shadow={settings.shadowStyle}
        onMouseDown={showSettings ? undefined : handleOverlayMouseDown}
      >
        <header
          className={`overlay-header${showSettings ? " settings-view" : ""}`}
        >
          <div
            className="header-brand"
            role="heading"
            aria-level={1}
            aria-label={showSettings ? "settings+" : "ctrl+"}
          >
            <div
              className="logo logo-main"
              aria-hidden={showSettings}
            >
              <span className="logo-ctrl">ctrl</span>
              <span className="logo-plus">+</span>
            </div>
            <div
              className="logo logo-settings"
              aria-hidden={!showSettings}
            >
              <span className="logo-ctrl">settings</span>
              <span className="logo-plus">+</span>
            </div>
          </div>
          <div className="overlay-header-actions">
            <span className="hotkey-hint">
              Press {settings.hotkey} to toggle
            </span>
            <button
              type="button"
              className="icon-button header-move"
              title="Move ctrl+ (click and hold to drag)"
              aria-label="Move ctrl+ window"
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                startWindowDrag();
              }}
              onPointerUp={endWindowDrag}
              onPointerLeave={endWindowDrag}
              onPointerCancel={endWindowDrag}
            >
              <svg
                className="icon-button-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2v20" />
                <path d="M2 12h20" />
                <path d="M9 5l3-3 3 3" />
                <path d="M9 19l3 3 3-3" />
                <path d="M5 9l-3 3 3 3" />
                <path d="M19 9l3 3-3 3" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button header-toggle"
              aria-label={showSettings ? "Back to clipboard" : "Settings"}
              onClick={() => setShowSettings((value) => !value)}
            >
              <span className="header-icon header-icon-settings" aria-hidden="true">
                <svg
                  className="icon-button-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span className="header-icon header-icon-back" aria-hidden="true">
                <svg
                  className="icon-button-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </span>
            </button>
          </div>
        </header>

        <div className="overlay-viewport">
          {showSettings ? (
            <div className="overlay-pane settings-pane active">
              <Settings
                settings={settings}
                license={license}
                isActive={showSettings}
                onChange={(nextSettings) => {
                  setSettings(nextSettings);
                  void saveSettings(nextSettings);
                }}
                onLicenseChange={setLicense}
                onSettingsRefresh={() => {
                  void refresh();
                }}
                onClose={() => setShowSettings(false)}
                onClearHistory={() => {
                  void clearHistory();
                }}
                onRecenter={recenterWindow}
              />
            </div>
          ) : (
            <div className="overlay-pane clipboard-pane active">
              <div className="overlay-body">
                <div className="search-row">
                  <div className="search-field">
                    <svg
                      className="search-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3-3" />
                    </svg>
                    <input
                      ref={searchRef}
                      type="text"
                      className="search-input"
                      placeholder="search clips..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      autoFocus
                    />
                  </div>
                </div>

                <ClipboardList
                  items={filteredItems}
                  selectedIndex={selectedIndex}
                  hoveredIndex={hoveredIndex}
                  showShortcuts={searchIsEmpty}
                  maxShortcuts={maxShortcuts}
                  isPro={isPro}
                  canReorder={isPro && searchIsEmpty}
                  onHoverIndexChange={setHoveredIndex}
                  onSelect={setSelectedIndex}
                  onPaste={(item) => {
                    void pasteItem(item);
                  }}
                  onTogglePin={(item) => {
                    void handleTogglePin(item);
                  }}
                  onReorder={(orderedIds) => {
                    void handleReorder(orderedIds);
                  }}
                />

                <footer className="overlay-footer">
                  <div className="footer-hints">
                    <span className="footer-hint">
                      <span className="footer-key-icons" aria-hidden="true">
                        <svg
                          className="footer-key-icon"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 2.5 2.5 5.5 5 2.5 7.5 5.5" />
                        </svg>
                        <svg
                          className="footer-key-icon"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 7.5 2.5 4.5 5 7.5 7.5 4.5" />
                        </svg>
                      </span>
                      navigate
                    </span>
                    <span className="footer-dot">·</span>
                    <span className="footer-hint">
                      <svg
                        className="footer-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 10l-4 4 4 4" />
                        <path d="M20 4v7a4 4 0 0 1-4 4H5" />
                      </svg>
                      paste
                    </span>
                    {searchIsEmpty && (
                      <>
                        <span className="footer-dot">·</span>
                        <span className="footer-hint">{pasteShortcutHint}</span>
                      </>
                    )}
                  </div>
                  {openMs !== null ? (
                    <div className="footer-meta">
                      <span className="footer-timing">
                        <svg
                          className="footer-timing-icon"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            cx="8"
                            cy="8"
                            r="6.5"
                            stroke="currentColor"
                            strokeWidth="1.25"
                          />
                          <path
                            d="M8 1.5a6.5 6.5 0 0 0 0 13Z"
                            fill="currentColor"
                          />
                        </svg>
                        {formatOpenMs(openMs)}
                      </span>
                    </div>
                  ) : null}
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
