import type { BorderStyle, FontStyle, ThemeId } from "./themes";
import type { OverlayPosition } from "./positions";

export type LicenseTier = "free" | "pro";

export interface LicenseStatus {
  tier: LicenseTier;
  key?: string | null;
  activatedAt?: number | null;
}

export const FREE_MAX_HISTORY = 5;

export interface ClipboardItem {
  id: number;
  content: string;
  createdAt: number;
  pinned: boolean;
  sortOrder: number;
}

export interface AppSettings {
  maxHistory: number;
  hotkey: string;
  launchOnStartup: boolean;
  theme: ThemeId;
  borderStyle: BorderStyle;
  fontStyle: FontStyle;
  overlayPosition: OverlayPosition;
}

export const HOTKEY_OPTIONS = [
  "Ctrl+Shift+V",
  "Ctrl+Shift+C",
  "Ctrl+`",
  "Ctrl+Shift+Space",
  "Alt+Shift+V",
] as const;

export const HISTORY_LIMIT_OPTIONS = [100, 250, 500, 1000, 2000] as const;
