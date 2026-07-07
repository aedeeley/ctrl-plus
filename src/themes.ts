export type ThemeId =
  | "midnight"
  | "slate"
  | "ocean"
  | "ember"
  | "paper"
  | "forest"
  | "grape"
  | "rose"
  | "aurora"
  | "carbon"
  | "dusk";

export type BorderStyle = "square" | "sharp" | "rounded" | "pill";
export type FontStyle = "system" | "mono" | "rounded";

export interface ThemeSwatch {
  id: ThemeId;
  gradient: string;
}

export interface BorderSwatch {
  id: BorderStyle;
  cardRadius: number;
  innerRadius: number;
}

export interface FontSwatch {
  id: FontStyle;
  sample: string;
  fontFamily: string;
}

export const FREE_THEMES: ThemeId[] = ["midnight", "paper"];

export const THEME_SWATCHES: ThemeSwatch[] = [
  { id: "midnight", gradient: "linear-gradient(135deg, #1a1625 0%, #13101c 100%)" },
  { id: "slate", gradient: "linear-gradient(135deg, #2a3444 0%, #141a24 100%)" },
  { id: "ocean", gradient: "linear-gradient(135deg, #123347 0%, #081520 100%)" },
  { id: "ember", gradient: "linear-gradient(135deg, #3a2218 0%, #1a0f0d 100%)" },
  { id: "forest", gradient: "linear-gradient(135deg, #152a1f 0%, #0a1610 100%)" },
  { id: "grape", gradient: "linear-gradient(135deg, #2d1f42 0%, #140f22 100%)" },
  { id: "rose", gradient: "linear-gradient(135deg, #3a1a2a 0%, #1a0c14 100%)" },
  { id: "aurora", gradient: "linear-gradient(135deg, #1a2f3a 0%, #142238 50%, #1a2830 100%)" },
  { id: "carbon", gradient: "linear-gradient(135deg, #2a2a2e 0%, #121214 100%)" },
  { id: "dusk", gradient: "linear-gradient(135deg, #2e2248 0%, #18122a 100%)" },
  { id: "paper", gradient: "linear-gradient(135deg, #ffffff 0%, #e8eef7 100%)" },
];

export const BORDER_SWATCHES: BorderSwatch[] = [
  { id: "square", cardRadius: 0, innerRadius: 0 },
  { id: "sharp", cardRadius: 4, innerRadius: 2 },
  { id: "rounded", cardRadius: 10, innerRadius: 6 },
  { id: "pill", cardRadius: 16, innerRadius: 10 },
];

export const FONT_SWATCHES: FontSwatch[] = [
  {
    id: "system",
    sample: "Aa",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  {
    id: "mono",
    sample: "Aa",
    fontFamily: '"Cascadia Mono", Consolas, monospace',
  },
  {
    id: "rounded",
    sample: "Aa",
    fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
  },
];

export function getSystemPreferredTheme(): ThemeId {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "paper";
  }
  return "midnight";
}

export function normalizeTheme(value: string): ThemeId {
  return THEME_SWATCHES.some((theme) => theme.id === value)
    ? (value as ThemeId)
    : "midnight";
}

export function normalizeBorder(value: string): BorderStyle {
  return BORDER_SWATCHES.some((border) => border.id === value)
    ? (value as BorderStyle)
    : "rounded";
}

export function normalizeFont(value: string): FontStyle {
  return FONT_SWATCHES.some((font) => font.id === value)
    ? (value as FontStyle)
    : "system";
}

export function applyAppearance(
  element: HTMLElement,
  theme: ThemeId,
  borderStyle: BorderStyle,
  fontStyle: FontStyle,
) {
  element.dataset.theme = theme;
  element.dataset.border = borderStyle;
  element.dataset.font = fontStyle;
}
