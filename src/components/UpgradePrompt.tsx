import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LicenseStatus } from "../types";

interface UpgradePromptProps {
  license: LicenseStatus;
  onLicenseChange: (license: LicenseStatus) => void;
  onSettingsRefresh: () => void;
}

export function UpgradePrompt({
  license,
  onLicenseChange,
  onSettingsRefresh,
}: UpgradePromptProps) {
  const [key, setKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (license.tier === "pro") {
    return (
      <div className="upgrade-banner pro-active">
        <span>Pro unlocked</span>
        {license.key && <span className="upgrade-key">{license.key}</span>}
      </div>
    );
  }

  const handleUpgrade = () => {
    void invoke("open_upgrade_page");
  };

  const handleActivate = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Enter a license key");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const status = await invoke<LicenseStatus>("activate_license", { key: trimmed });
      onLicenseChange(status);
      onSettingsRefresh();
      setShowKeyInput(false);
      setKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upgrade-banner">
      <div className="upgrade-copy">
        <strong>Upgrade to Pro — $5</strong>
        <span>Unlimited history, all themes, borders, fonts, and popup position.</span>
      </div>
      <div className="upgrade-actions">
        <button type="button" className="upgrade-button" onClick={handleUpgrade}>
          Upgrade
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setShowKeyInput((value) => !value)}
        >
          Enter license key
        </button>
      </div>
      {showKeyInput && (
        <div className="upgrade-key-row">
          <input
            type="text"
            className="upgrade-key-input"
            placeholder="CTRL-XXXX-XXXX-XXXX"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleActivate();
              }
            }}
          />
          <button
            type="button"
            className="upgrade-button"
            disabled={busy}
            onClick={() => {
              void handleActivate();
            }}
          >
            Activate
          </button>
        </div>
      )}
      {error && <p className="upgrade-error">{error}</p>}
    </div>
  );
}
