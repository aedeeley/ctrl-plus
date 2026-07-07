import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BorderPicker, FontPicker, PositionPicker, ThemePicker } from "./AppearancePickers";
import {
  HISTORY_LIMIT_OPTIONS,
  HOTKEY_OPTIONS,
  FREE_MAX_HISTORY,
  type AppSettings,
  type LicenseStatus,
} from "../types";
import { SelectField } from "./SelectField";
import { UpgradePrompt } from "./UpgradePrompt";

interface SettingsProps {
  settings: AppSettings;
  license: LicenseStatus;
  isActive: boolean;
  onChange: (settings: AppSettings) => void;
  onLicenseChange: (license: LicenseStatus) => void;
  onSettingsRefresh: () => void;
  onClose: () => void;
  onClearHistory: () => void;
}

export function Settings({
  settings,
  license,
  isActive,
  onChange,
  onLicenseChange,
  onSettingsRefresh,
  onClose,
  onClearHistory,
}: SettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isPro = license.tier === "pro";

  useEffect(() => {
    if (isActive) {
      panelRef.current?.focus();
    }
  }, [isActive]);

  const handleUpgradeClick = () => {
    void invoke("open_upgrade_page");
  };

  return (
    <div
      className="settings-panel"
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="settings-scroll overlay-body">
        <UpgradePrompt
          license={license}
          onLicenseChange={onLicenseChange}
          onSettingsRefresh={onSettingsRefresh}
        />

        <div className="appearance-section">
          <ThemePicker
            value={settings.theme}
            isPro={isPro}
            onUpgradeClick={handleUpgradeClick}
            onChange={(theme) => onChange({ ...settings, theme })}
          />
          <FontPicker
            value={settings.fontStyle}
            isPro={isPro}
            onUpgradeClick={handleUpgradeClick}
            onChange={(fontStyle) => onChange({ ...settings, fontStyle })}
          />
          <BorderPicker
            value={settings.borderStyle}
            isPro={isPro}
            onUpgradeClick={handleUpgradeClick}
            onChange={(borderStyle) => onChange({ ...settings, borderStyle })}
          />
          <PositionPicker
            value={settings.overlayPosition}
            isPro={isPro}
            onUpgradeClick={handleUpgradeClick}
            onChange={(overlayPosition) =>
              onChange({ ...settings, overlayPosition })
            }
          />
        </div>

        <SelectField
          label="Global hotkey"
          value={settings.hotkey}
          options={HOTKEY_OPTIONS.map((option) => ({
            value: option,
            label: option,
          }))}
          onChange={(hotkey) => onChange({ ...settings, hotkey })}
        />

        {isPro ? (
          <SelectField
            label="History limit"
            value={settings.maxHistory}
            options={HISTORY_LIMIT_OPTIONS.map((option) => ({
              value: option,
              label: `${option} items`,
            }))}
            onChange={(maxHistory) => onChange({ ...settings, maxHistory })}
          />
        ) : (
          <div className="setting-static">
            <span className="select-label">History limit</span>
            <div className="setting-static-value">
              {FREE_MAX_HISTORY} items (Free)
            </div>
          </div>
        )}

        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={settings.launchOnStartup}
            onChange={(event) =>
              onChange({
                ...settings,
                launchOnStartup: event.target.checked,
              })
            }
          />
          <span>Launch on Windows startup</span>
        </label>

        <div className="settings-actions">
          <button
            type="button"
            className="danger-button"
            onClick={onClearHistory}
          >
            Clear history
          </button>
        </div>

        <p className="settings-note">
          All clipboard data stays on your device. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
