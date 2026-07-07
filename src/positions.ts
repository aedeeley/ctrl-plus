export type OverlayPosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const OVERLAY_POSITIONS: OverlayPosition[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

export function normalizeOverlayPosition(value: string): OverlayPosition {
  return OVERLAY_POSITIONS.includes(value as OverlayPosition)
    ? (value as OverlayPosition)
    : "center";
}
