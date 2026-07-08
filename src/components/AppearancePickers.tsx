import type { ReactNode } from "react";
import type { BorderStyle, FontStyle, ShadowStyle, ThemeId } from "../themes";
import {
  BORDER_SWATCHES,
  FONT_SWATCHES,
  FREE_THEMES,
  getThemeLabel,
  SHADOW_SWATCHES,
  THEME_SWATCHES,
} from "../themes";

interface SwatchRowProps {
  label: string;
  caption?: string;
  children: ReactNode;
  locked?: boolean;
  onUpgradeClick?: () => void;
}

function SwatchRow({
  label,
  caption,
  children,
  locked = false,
  onUpgradeClick,
}: SwatchRowProps) {
  return (
    <div className={`appearance-row ${locked ? "pro-locked-row" : ""}`}>
      <div className="appearance-row-header">
        <div className="appearance-row-titles">
          <span className="appearance-label">{label}</span>
          {caption && <span className="appearance-caption">{caption}</span>}
        </div>
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
    <SwatchRow label="Theme" caption={getThemeLabel(value)}>
      {THEME_SWATCHES.map((theme) => {
        const isFreeTheme = FREE_THEMES.includes(theme.id);
        const locked = !isPro && !isFreeTheme;

        return (
          <button
            key={theme.id}
            type="button"
            className={`swatch theme-swatch ${value === theme.id ? "selected" : ""} ${locked ? "locked" : ""}`}
            style={{ background: theme.gradient }}
            title={locked ? `${theme.label} (Pro)` : theme.label}
            aria-label={theme.label}
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
  const selected = BORDER_SWATCHES.find((border) => border.id === value);

  return (
    <SwatchRow
      label="Border"
      caption={selected?.label}
      locked={!isPro}
      onUpgradeClick={onUpgradeClick}
    >
      {BORDER_SWATCHES.map((border) => (
        <button
          key={border.id}
          type="button"
          className={`swatch border-swatch ${value === border.id ? "selected" : ""}`}
          title={!isPro ? `${border.label} (Pro)` : border.label}
          aria-label={border.label}
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
  const selected = FONT_SWATCHES.find((font) => font.id === value);

  return (
    <SwatchRow
      label="Font"
      caption={selected?.label}
      locked={!isPro}
      onUpgradeClick={onUpgradeClick}
    >
      {FONT_SWATCHES.map((font) => (
        <button
          key={font.id}
          type="button"
          className={`swatch font-swatch ${value === font.id ? "selected" : ""}`}
          style={{ fontFamily: font.fontFamily }}
          title={!isPro ? `${font.label} (Pro)` : font.label}
          aria-label={font.label}
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

interface ShadowPickerProps extends PickerProps {
  value: ShadowStyle;
  onChange: (shadowStyle: ShadowStyle) => void;
}

export function ShadowPicker({
  value,
  onChange,
  isPro,
  onUpgradeClick,
}: ShadowPickerProps) {
  const selected = SHADOW_SWATCHES.find((shadow) => shadow.id === value);

  return (
    <SwatchRow
      label="Shadow"
      caption={selected?.label}
      locked={!isPro}
      onUpgradeClick={onUpgradeClick}
    >
      {SHADOW_SWATCHES.map((shadow) => (
        <button
          key={shadow.id}
          type="button"
          className={`swatch shadow-swatch ${value === shadow.id ? "selected" : ""}`}
          title={!isPro ? `${shadow.label} (Pro)` : shadow.label}
          aria-label={shadow.label}
          aria-pressed={value === shadow.id}
          disabled={!isPro}
          onClick={() => {
            if (!isPro) {
              onUpgradeClick?.();
              return;
            }
            onChange(shadow.id);
          }}
        >
          <span
            className="shadow-swatch-preview"
            style={{ boxShadow: shadow.previewShadow }}
          />
        </button>
      ))}
    </SwatchRow>
  );
}
