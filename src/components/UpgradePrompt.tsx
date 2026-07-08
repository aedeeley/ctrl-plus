import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LicenseStatus } from "../types";

interface UpgradePromptProps {
  license: LicenseStatus;
  onLicenseChange: (license: LicenseStatus) => void;
  onSettingsRefresh: () => void;
}

const PRO_FEATURES = [
  "Up to 5,000 clipboard items",
  "24 themes including AMOLED & high-contrast",
  "7 border radius styles",
  "7 font options",
  "Pin and reorder clips",
  "Number hotkeys 1–9",
] as const;

function CheckIcon() {
  return (
    <svg
      className="pro-feature-check"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function UpgradePrompt({
  license,
  onLicenseChange,
  onSettingsRefresh,
}: UpgradePromptProps) {
  const [key, setKey] = useState(license.key ?? "");
  const [showKeyInput, setShowKeyInput] = useState(Boolean(license.key));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (license.tier === "pro") {
      return;
    }

    if (license.key) {
      setKey(license.key);
      setShowKeyInput(true);
    }
  }, [license.key, license.tier]);

  if (license.tier === "pro") {
    const handleDeactivate = async () => {
      setBusy(true);
      setError(null);
      try {
        const status = await invoke<LicenseStatus>("deactivate_license");
        onLicenseChange(status);
        onSettingsRefresh();
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="pro-panel pro-panel-active">
        <div className="pro-panel-hero">
          <div className="pro-panel-badge">Pro active</div>
          <h2 className="pro-panel-title">ctrl+ pro</h2>
          <p className="pro-panel-subtitle">All features unlocked on this device.</p>
        </div>
        <ul className="pro-feature-list">
          {PRO_FEATURES.map((feature) => (
            <li key={feature}>
              <CheckIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {license.key && <span className="upgrade-key">{license.key}</span>}
        {confirming ? (
          <div className="upgrade-deactivate-confirm">
            <span>
              Remove Pro from this device? Your license key can be activated on
              another machine.
            </span>
            <div className="upgrade-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={() => {
                  void handleDeactivate();
                }}
              >
                Remove from this device
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="ghost-button upgrade-deactivate-trigger"
            onClick={() => setConfirming(true)}
          >
            Remove from this device
          </button>
        )}
        {error && <p className="upgrade-error">{error}</p>}
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
    <div className="pro-panel">
      <div className="pro-panel-hero">
        <div className="pro-panel-badge locked">Upgrade</div>
        <h2 className="pro-panel-title">ctrl+ pro</h2>
        <p className="pro-panel-price">$5 one-time</p>
        <p className="pro-panel-subtitle">
          Unlock the full clipboard experience. Pay once, keep forever.
        </p>
      </div>
      <ul className="pro-feature-list">
        {PRO_FEATURES.map((feature) => (
          <li key={feature}>
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="upgrade-actions">
        <button type="button" className="upgrade-button" onClick={handleUpgrade}>
          Upgrade to Pro
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
