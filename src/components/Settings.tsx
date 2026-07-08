import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BorderPicker, FontPicker, ShadowPicker, ThemePicker } from "./AppearancePickers";
import {
  HISTORY_LIMIT_OPTIONS,
  HOTKEY_OPTIONS,
  FREE_MAX_HISTORY,
  type AppSettings,
  type LicenseStatus,
} from "../types";
import { SelectField } from "./SelectField";
import { UpgradePrompt } from "./UpgradePrompt";
import { UpdateSection } from "./UpdateSection";

type SettingsTab = "appearance" | "general" | "pro" | "about";

interface SettingsProps {
  settings: AppSettings;
  license: LicenseStatus;
  isActive: boolean;
  onChange: (settings: AppSettings) => void;
  onLicenseChange: (license: LicenseStatus) => void;
  onSettingsRefresh: () => void;
  onClose: () => void;
  onClearHistory: () => void;
  onRecenter: () => void;
}

const SETTINGS_TABS: { id: SettingsTab; label: string; pro?: boolean }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "general", label: "General" },
  { id: "pro", label: "ctrl+ pro", pro: true },
  { id: "about", label: "About" },
];

export function Settings({
  settings,
  license,
  isActive,
  onChange,
  onLicenseChange,
  onSettingsRefresh,
  onClose,
  onClearHistory,
  onRecenter,
}: SettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const isPro = license.tier === "pro";

  useEffect(() => {
    if (isActive) {
      panelRef.current?.focus();
    }
  }, [isActive]);

  const handleUpgradeClick = () => {
    setActiveTab("pro");
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
      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`settings-tab ${tab.pro ? "settings-tab-pro" : ""} ${activeTab === tab.id ? "active" : ""}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.pro && !isPro && <span className="settings-tab-badge">Pro</span>}
            {tab.pro && isPro && <span className="settings-tab-badge unlocked">Active</span>}
          </button>
        ))}
      </div>

      <div className="settings-scroll overlay-body">
        {activeTab === "appearance" && (
          <div className="settings-tab-panel" role="tabpanel">
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
              <ShadowPicker
                value={settings.shadowStyle}
                isPro={isPro}
                onUpgradeClick={handleUpgradeClick}
                onChange={(shadowStyle) => onChange({ ...settings, shadowStyle })}
              />
              <div className="appearance-row">
                <div className="appearance-row-header">
                  <div className="appearance-row-titles">
                    <span className="appearance-label">Position</span>
                    <span className="appearance-caption">
                      Drag the move handle in the header to reposition
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="ghost-button reset-position-button"
                  onClick={onRecenter}
                >
                  Reset to center
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "general" && (
          <div className="settings-tab-panel" role="tabpanel">
            <div className="settings-group">
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
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="danger-button"
                onClick={onClearHistory}
              >
                Clear history
              </button>
            </div>
          </div>
        )}

        {activeTab === "pro" && (
          <div className="settings-tab-panel" role="tabpanel">
            <UpgradePrompt
              license={license}
              onLicenseChange={onLicenseChange}
              onSettingsRefresh={onSettingsRefresh}
            />
          </div>
        )}

        {activeTab === "about" && (
          <div className="settings-tab-panel" role="tabpanel">
            <UpdateSection />
            <p className="settings-note">
              All clipboard data stays on your device. Nothing is uploaded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
