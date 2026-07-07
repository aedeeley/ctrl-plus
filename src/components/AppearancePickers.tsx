import type { ReactNode } from "react";
import type { BorderStyle, FontStyle, ThemeId } from "../themes";
import type { OverlayPosition } from "../positions";
import { OVERLAY_POSITIONS } from "../positions";
import {
  BORDER_SWATCHES,
  FONT_SWATCHES,
  FREE_THEMES,
  THEME_SWATCHES,
} from "../themes";

interface SwatchRowProps {
  label: string;
  children: ReactNode;
  locked?: boolean;
  onUpgradeClick?: () => void;
}

function SwatchRow({ label, children, locked = false, onUpgradeClick }: SwatchRowProps) {
  return (
    <div className={`appearance-row ${locked ? "pro-locked-row" : ""}`}>
      <div className="appearance-row-header">
        <span className="appearance-label">{label}</span>
        {locked && (
          <button type="button" className="pro-badge" onClick={onUpgradeClick}>
            Pro
          </button>
        )}
      </div>
      <div className={`appearance-swatches ${locked ? "pro-locked" : ""}`}>{children}</div>
    </div>
  );
}

interface PickerProps {
  isPro: boolean;
  onUpgradeClick?: () => void;
}

interface ThemePickerProps extends PickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemePicker({
  value,
  onChange,
  isPro,
  onUpgradeClick,
}: ThemePickerProps) {
  return (
    <SwatchRow label="Theme">
      {THEME_SWATCHES.map((theme) => {
        const isFreeTheme = FREE_THEMES.includes(theme.id);
        const locked = !isPro && !isFreeTheme;

        return (
          <button
            key={theme.id}
            type="button"
            className={`swatch theme-swatch ${value === theme.id ? "selected" : ""} ${locked ? "locked" : ""}`}
            style={{ background: theme.gradient }}
            aria-label={theme.id}
            aria-pressed={value === theme.id}
            disabled={locked}
            onClick={() => {
              if (locked) {
                onUpgradeClick?.();
                return;
              }
              onChange(theme.id);
            }}
          >
            {locked && <span className="swatch-lock" aria-hidden="true" />}
          </button>
        );
      })}
    </SwatchRow>
  );
}

interface BorderPickerProps extends PickerProps {
  value: BorderStyle;
  onChange: (borderStyle: BorderStyle) => void;
}

export function BorderPicker({
  value,
  onChange,
  isPro,
  onUpgradeClick,
}: BorderPickerProps) {
  return (
    <SwatchRow
      label="Border"
      locked={!isPro}
      onUpgradeClick={onUpgradeClick}
    >
      {BORDER_SWATCHES.map((border) => (
        <button
          key={border.id}
          type="button"
          className={`swatch border-swatch ${value === border.id ? "selected" : ""}`}
          aria-label={border.id}
          aria-pressed={value === border.id}
          disabled={!isPro}
          onClick={() => {
            if (!isPro) {
              onUpgradeClick?.();
              return;
            }
            onChange(border.id);
          }}
        >
          <span
            className="border-swatch-frame"
            style={{ borderRadius: border.cardRadius }}
          >
            <span
              className="border-swatch-inner"
              style={{ borderRadius: border.innerRadius }}
            />
          </span>
        </button>
      ))}
    </SwatchRow>
  );
}

interface FontPickerProps extends PickerProps {
  value: FontStyle;
  onChange: (fontStyle: FontStyle) => void;
}

export function FontPicker({
  value,
  onChange,
  isPro,
  onUpgradeClick,
}: FontPickerProps) {
  return (
    <SwatchRow label="Font" locked={!isPro} onUpgradeClick={onUpgradeClick}>
      {FONT_SWATCHES.map((font) => (
        <button
          key={font.id}
          type="button"
          className={`swatch font-swatch ${value === font.id ? "selected" : ""}`}
          style={{ fontFamily: font.fontFamily }}
          aria-label={font.id}
          aria-pressed={value === font.id}
          disabled={!isPro}
          onClick={() => {
            if (!isPro) {
              onUpgradeClick?.();
              return;
            }
            onChange(font.id);
          }}
        >
          {font.sample}
        </button>
      ))}
    </SwatchRow>
  );
}

interface PositionPickerProps extends PickerProps {
  value: OverlayPosition;
  onChange: (position: OverlayPosition) => void;
}

export function PositionPicker({
  value,
  onChange,
  isPro,
  onUpgradeClick,
}: PositionPickerProps) {
  return (
    <div className={`appearance-row ${!isPro ? "pro-locked-row" : ""}`}>
      <div className="appearance-row-header">
        <span className="appearance-label">Position</span>
        {!isPro && (
          <button type="button" className="pro-badge" onClick={onUpgradeClick}>
            Pro
          </button>
        )}
      </div>
      <div
        className={`position-picker ${!isPro ? "pro-locked" : ""}`}
        role="group"
        aria-label="Popup position"
      >
        {OVERLAY_POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            className={`position-cell ${value === position ? "selected" : ""}`}
            data-position={position}
            aria-label={position}
            aria-pressed={value === position}
            disabled={!isPro}
            onClick={() => {
              if (!isPro) {
                onUpgradeClick?.();
                return;
              }
              onChange(position);
            }}
          >
            <span className="position-cell-frame">
              <span className="position-marker" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
