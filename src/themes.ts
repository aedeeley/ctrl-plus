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
  | "dusk"
  | "black"
  | "obsidian"
  | "eclipse"
  | "contrast"
  | "daylight"
  | "sunset"
  | "nord"
  | "mocha"
  | "crimson"
  | "gold"
  | "mint"
  | "sky"
  | "sand"
  | "steel"
  | "wine"
  | "lagoon"
  | "sage"
  | "plum"
  | "latte";

export type BorderStyle =
  | "square"
  | "sharp"
  | "soft"
  | "rounded"
  | "curved"
  | "pill"
  | "round";

export type FontStyle =
  | "system"
  | "humanist"
  | "rounded"
  | "condensed"
  | "serif"
  | "elegant"
  | "mono";

export type ShadowStyle = "none" | "soft" | "medium" | "large" | "glow";

export interface ThemeSwatch {
  id: ThemeId;
  label: string;
  gradient: string;
}

export interface BorderSwatch {
  id: BorderStyle;
  label: string;
  cardRadius: number;
  innerRadius: number;
}

export interface FontSwatch {
  id: FontStyle;
  label: string;
  sample: string;
  fontFamily: string;
}

export interface ShadowSwatch {
  id: ShadowStyle;
  label: string;
  previewShadow: string;
}

export const FREE_THEMES: ThemeId[] = ["midnight", "paper"];

export const THEME_SWATCHES: ThemeSwatch[] = [
  // Neutral darks
  { id: "midnight", label: "Midnight", gradient: "linear-gradient(135deg, #1a1625 0%, #13101c 100%)" },
  { id: "slate", label: "Slate", gradient: "linear-gradient(135deg, #2a3444 0%, #141a24 100%)" },
  { id: "steel", label: "Steel", gradient: "linear-gradient(135deg, #232a33 0%, #151a20 100%)" },
  { id: "nord", label: "Nord", gradient: "linear-gradient(135deg, #2e3440 0%, #242933 100%)" },
  { id: "carbon", label: "Carbon", gradient: "linear-gradient(135deg, #2a2a2e 0%, #121214 100%)" },
  // AMOLED blacks & high contrast
  { id: "black", label: "Black", gradient: "linear-gradient(135deg, #0a0a0a 0%, #000000 100%)" },
  { id: "obsidian", label: "Obsidian", gradient: "linear-gradient(135deg, #0d0a14 0%, #000000 100%)" },
  { id: "eclipse", label: "Eclipse", gradient: "linear-gradient(135deg, #001018 0%, #000000 100%)" },
  { id: "contrast", label: "Contrast", gradient: "linear-gradient(135deg, #111111 0%, #000000 100%)" },
  // Blues & cyans
  { id: "ocean", label: "Ocean", gradient: "linear-gradient(135deg, #123347 0%, #081520 100%)" },
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(135deg, #1a2f3a 0%, #142238 50%, #1a2830 100%)" },
  { id: "lagoon", label: "Lagoon", gradient: "linear-gradient(135deg, #0e2e33 0%, #071a1e 100%)" },
  // Greens
  { id: "forest", label: "Forest", gradient: "linear-gradient(135deg, #152a1f 0%, #0a1610 100%)" },
  { id: "mint", label: "Mint", gradient: "linear-gradient(135deg, #102a24 0%, #081a14 100%)" },
  { id: "sage", label: "Sage", gradient: "linear-gradient(135deg, #202a20 0%, #121a12 100%)" },
  // Warm tones
  { id: "ember", label: "Ember", gradient: "linear-gradient(135deg, #3a2218 0%, #1a0f0d 100%)" },
  { id: "sunset", label: "Sunset", gradient: "linear-gradient(135deg, #3d1f2a 0%, #1a0a10 100%)" },
  { id: "gold", label: "Gold", gradient: "linear-gradient(135deg, #2a2410 0%, #1a1608 100%)" },
  { id: "mocha", label: "Mocha", gradient: "linear-gradient(135deg, #2a1f18 0%, #1a120c 100%)" },
  { id: "crimson", label: "Crimson", gradient: "linear-gradient(135deg, #2a1018 0%, #140810 100%)" },
  { id: "wine", label: "Wine", gradient: "linear-gradient(135deg, #2e1620 0%, #180a10 100%)" },
  // Purples & pinks
  { id: "grape", label: "Grape", gradient: "linear-gradient(135deg, #2d1f42 0%, #140f22 100%)" },
  { id: "dusk", label: "Dusk", gradient: "linear-gradient(135deg, #2e2248 0%, #18122a 100%)" },
  { id: "plum", label: "Plum", gradient: "linear-gradient(135deg, #2a1830 0%, #160c1a 100%)" },
  { id: "rose", label: "Rose", gradient: "linear-gradient(135deg, #3a1a2a 0%, #1a0c14 100%)" },
  // Light themes
  { id: "paper", label: "Paper", gradient: "linear-gradient(135deg, #ffffff 0%, #e8eef7 100%)" },
  { id: "daylight", label: "Daylight", gradient: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)" },
  { id: "sky", label: "Sky", gradient: "linear-gradient(135deg, #e8f4fc 0%, #d0e8f8 100%)" },
  { id: "sand", label: "Sand", gradient: "linear-gradient(135deg, #faf6f0 0%, #f0e8dc 100%)" },
  { id: "latte", label: "Latte", gradient: "linear-gradient(135deg, #f5efe6 0%, #e6dccd 100%)" },
];

export const BORDER_SWATCHES: BorderSwatch[] = [
  { id: "square", label: "Square", cardRadius: 0, innerRadius: 0 },
  { id: "sharp", label: "Sharp", cardRadius: 6, innerRadius: 4 },
  { id: "soft", label: "Soft", cardRadius: 10, innerRadius: 6 },
  { id: "rounded", label: "Rounded", cardRadius: 16, innerRadius: 10 },
  { id: "curved", label: "Curved", cardRadius: 20, innerRadius: 12 },
  { id: "pill", label: "Pill", cardRadius: 24, innerRadius: 14 },
  { id: "round", label: "Round", cardRadius: 30, innerRadius: 18 },
];

export const FONT_SWATCHES: FontSwatch[] = [
  {
    id: "system",
    label: "System",
    sample: "Aa",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  {
    id: "humanist",
    label: "Humanist",
    sample: "Aa",
    fontFamily: 'Calibri, Candara, "Segoe UI", sans-serif',
  },
  {
    id: "rounded",
    label: "Rounded",
    sample: "Aa",
    fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
  },
  {
    id: "condensed",
    label: "Condensed",
    sample: "Aa",
    fontFamily: 'Bahnschrift, "Segoe UI", sans-serif',
  },
  {
    id: "serif",
    label: "Serif",
    sample: "Aa",
    fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: "elegant",
    label: "Elegant",
    sample: "Aa",
    fontFamily: 'Cambria, Constantia, Georgia, serif',
  },
  {
    id: "mono",
    label: "Mono",
    sample: "Aa",
    fontFamily: '"Cascadia Mono", Consolas, monospace',
  },
];

export const SHADOW_SWATCHES: ShadowSwatch[] = [
  { id: "none", label: "None", previewShadow: "none" },
  { id: "soft", label: "Soft", previewShadow: "0 2px 8px rgba(0, 0, 0, 0.35)" },
  { id: "medium", label: "Medium", previewShadow: "0 4px 20px rgba(0, 0, 0, 0.45)" },
  { id: "large", label: "Large", previewShadow: "0 14px 40px rgba(0, 0, 0, 0.5)" },
  { id: "glow", label: "Glow", previewShadow: "0 0 48px rgba(0, 0, 0, 0.4)" },
];

export function getThemeLabel(themeId: ThemeId): string {
  return THEME_SWATCHES.find((theme) => theme.id === themeId)?.label ?? themeId;
}

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

export function normalizeShadow(value: string): ShadowStyle {
  return SHADOW_SWATCHES.some((shadow) => shadow.id === value)
    ? (value as ShadowStyle)
    : "medium";
}

export function applyAppearance(
  element: HTMLElement,
  theme: ThemeId,
  borderStyle: BorderStyle,
  fontStyle: FontStyle,
  shadowStyle: ShadowStyle,
) {
  element.dataset.theme = theme;
  element.dataset.border = borderStyle;
  element.dataset.font = fontStyle;
  element.dataset.shadow = shadowStyle;
}
