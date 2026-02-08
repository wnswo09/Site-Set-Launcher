import { getAppStorage } from "../storage";
import { formatRunError, runPresetById } from "../runtime";
import { openOptionsPage } from "../chrome-api";
import type { AppStorageV1, Preset } from "../types";

const presetGrid = document.querySelector<HTMLDivElement>("#preset-grid");
const statusElement = document.querySelector<HTMLParagraphElement>("#status");
const openOptionsButton = document.querySelector<HTMLButtonElement>("#open-options-btn");
const reloadButton = document.querySelector<HTMLButtonElement>("#reload-btn");

let appStorage: AppStorageV1 | null = null;

function setStatus(message: string, isError = false): void {
  if (!statusElement) {
    return;
  }
  statusElement.textContent = message;
  statusElement.classList.toggle("status--error", isError);
}

async function runPreset(preset: Preset): Promise<void> {
  setStatus(`Launching "${preset.name}"...`);

  try {
    const result = await runPresetById(preset.id, "quick-launch");
    if (!result.ok) {
      setStatus(formatRunError(result), true);
      return;
    }
    setStatus(`Opened ${result.openedCount} tabs in a new window.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`An error occurred while running. (${message})`, true);
  }
}

function renderPresets(): void {
  if (!presetGrid) {
    return;
  }
  if (!appStorage) {
    return;
  }

  presetGrid.innerHTML = "";

  if (appStorage.presets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No sets yet. Add one from Settings first.";
    presetGrid.append(empty);
    return;
  }

  appStorage.presets.forEach((preset, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card";
    const hotkey = index < 9 ? `${index + 1}. ` : "";
    button.textContent = `${hotkey}${preset.name} (${preset.urls.length})`;
    button.addEventListener("click", () => {
      void runPreset(preset);
    });
    presetGrid.append(button);
  });
}

async function refresh(): Promise<void> {
  appStorage = await getAppStorage();
  renderPresets();
  setStatus("");
}

if (reloadButton) {
  reloadButton.addEventListener("click", () => {
    void refresh();
  });
}

if (openOptionsButton) {
  openOptionsButton.addEventListener("click", () => {
    void openOptionsPage();
  });
}

document.addEventListener("keydown", (event) => {
  if (!appStorage) {
    return;
  }

  const index = Number(event.key) - 1;
  if (Number.isNaN(index) || index < 0 || index > 8) {
    return;
  }

  const preset = appStorage.presets[index];
  if (!preset) {
    return;
  }
  void runPreset(preset);
});

void refresh();
