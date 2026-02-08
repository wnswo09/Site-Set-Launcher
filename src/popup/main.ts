import { getAppStorage } from "../storage";
import { formatRunError, runPresetById } from "../runtime";
import { openOptionsPage } from "../chrome-api";
import type { AppStorageV1 } from "../types";

const presetSelect = document.querySelector<HTMLSelectElement>("#preset-select");
const runButton = document.querySelector<HTMLButtonElement>("#run-btn");
const openOptionsButton = document.querySelector<HTMLButtonElement>("#open-options-btn");
const statusElement = document.querySelector<HTMLParagraphElement>("#status");
const hintElement = document.querySelector<HTMLParagraphElement>("#hint");

let appStorage: AppStorageV1 | null = null;

function setStatus(message: string, isError = false): void {
  if (!statusElement) {
    return;
  }
  statusElement.textContent = message;
  statusElement.classList.toggle("status--error", isError);
}

function getInitialPresetId(storage: AppStorageV1): string | undefined {
  if (storage.settings.lastUsedPresetId) {
    return storage.settings.lastUsedPresetId;
  }
  if (storage.settings.defaultPresetId) {
    return storage.settings.defaultPresetId;
  }
  return storage.presets[0]?.id;
}

function renderPresetSelect(): void {
  if (!presetSelect) {
    return;
  }
  if (!appStorage) {
    return;
  }

  presetSelect.innerHTML = "";

  if (appStorage.presets.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.textContent = "Create a set first";
    emptyOption.value = "";
    presetSelect.append(emptyOption);
    presetSelect.disabled = true;
    if (runButton) {
      runButton.disabled = true;
    }
    setStatus("No saved sets found. Create one in Settings.");
    return;
  }

  for (const preset of appStorage.presets) {
    const option = document.createElement("option");
    const defaultBadge = appStorage.settings.defaultPresetId === preset.id ? " (Default)" : "";
    option.value = preset.id;
    option.textContent = `${preset.name} (${preset.urls.length})${defaultBadge}`;
    presetSelect.append(option);
  }

  const initialPresetId = getInitialPresetId(appStorage);
  if (initialPresetId) {
    presetSelect.value = initialPresetId;
  }
  presetSelect.disabled = false;
  if (runButton) {
    runButton.disabled = false;
  }
  setStatus("");
}

async function runSelectedPreset(): Promise<void> {
  if (!presetSelect || !runButton) {
    return;
  }
  if (!appStorage) {
    setStatus("Loading settings. Please try again in a moment.", true);
    return;
  }

  const presetId = presetSelect.value;
  if (!presetId) {
    setStatus("Please select a set to run.", true);
    return;
  }

  runButton.disabled = true;
  setStatus("Launching set...");

  try {
    const result = await runPresetById(presetId, "popup");
    if (!result.ok) {
      setStatus(formatRunError(result), true);
      return;
    }
    setStatus(`Opened ${result.openedCount} tabs in a new window.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`An error occurred while running. (${message})`, true);
  } finally {
    runButton.disabled = false;
  }
}

async function bootstrap(): Promise<void> {
  appStorage = await getAppStorage();
  renderPresetSelect();

  if (hintElement) {
    hintElement.textContent = "Shortcut: Alt+Shift+L (Mac: Command+Shift+L)";
  }
}

if (runButton) {
  runButton.addEventListener("click", () => {
    void runSelectedPreset();
  });
}

if (openOptionsButton) {
  openOptionsButton.addEventListener("click", () => {
    void openOptionsPage();
  });
}

void bootstrap();
