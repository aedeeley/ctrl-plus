import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "installing"
  | "error";

export function UpdateSection() {
  const [version, setVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Awaited<
    ReturnType<typeof check>
  > | null>(null);

  useEffect(() => {
    void getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  const handleCheck = async () => {
    setStatus("checking");
    setError(null);
    setAvailableVersion(null);
    setReleaseNotes(null);
    setDownloadProgress(null);
    setPendingUpdate(null);

    try {
      const update = await check();
      if (!update) {
        setStatus("up-to-date");
        return;
      }

      setPendingUpdate(update);
      setAvailableVersion(update.version);
      setReleaseNotes(update.body ?? null);
      setStatus("available");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInstall = async () => {
    if (!pendingUpdate) {
      return;
    }

    setStatus("downloading");
    setError(null);
    setDownloadProgress(0);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await pendingUpdate.downloadAndInstall((event: DownloadEvent) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setDownloadProgress(0);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            break;
        }
      });

      setStatus("installing");
      await relaunch();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const statusMessage = (() => {
    switch (status) {
      case "checking":
        return "Checking for updates…";
      case "up-to-date":
        return "You're on the latest version.";
      case "available":
        return `Version ${availableVersion} is available.`;
      case "downloading":
        return downloadProgress !== null
          ? `Downloading update… ${downloadProgress}%`
          : "Downloading update…";
      case "installing":
        return "Installing update. ctrl+ will restart.";
      default:
        return null;
    }
  })();

  const busy =
    status === "checking" ||
    status === "downloading" ||
    status === "installing";

  return (
    <div className="update-section">
      <div className="setting-static">
        <span className="select-label">App version</span>
        <div className="setting-static-value">
          {version ? `v${version}` : "Unknown"}
        </div>
      </div>

      <div className="update-actions">
        <button
          type="button"
          className="ghost-button"
          disabled={busy}
          onClick={() => {
            void handleCheck();
          }}
        >
          {status === "checking" ? "Checking…" : "Check for updates"}
        </button>

        {status === "available" && (
          <button
            type="button"
            className="upgrade-button"
            disabled={busy}
            onClick={() => {
              void handleInstall();
            }}
          >
            Install update
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="update-status" data-status={status}>
          {statusMessage}
        </p>
      )}

      {releaseNotes && status === "available" && (
        <p className="update-notes">{releaseNotes}</p>
      )}

      {error && <p className="update-error">{error}</p>}
    </div>
  );
}
