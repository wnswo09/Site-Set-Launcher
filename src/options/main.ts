import { createPreset, getAppStorage, saveAppStorage } from "../storage";
import type { AppStorageV1, Preset } from "../types";

const newPresetNameInput = document.querySelector<HTMLInputElement>("#new-preset-name");
const addPresetButton = document.querySelector<HTMLButtonElement>("#add-preset-btn");
const presetListElement = document.querySelector<HTMLUListElement>("#preset-list");
const defaultPresetSelect = document.querySelector<HTMLSelectElement>("#default-preset-select");
const presetNameInput = document.querySelector<HTMLInputElement>("#preset-name-input");
const urlsTextarea = document.querySelector<HTMLTextAreaElement>("#urls-textarea");
const savePresetButton = document.querySelector<HTMLButtonElement>("#save-preset-btn");
const deletePresetButton = document.querySelector<HTMLButtonElement>("#delete-preset-btn");
const statusElement = document.querySelector<HTMLParagraphElement>("#status");

let appStorage: AppStorageV1 | null = null;
let selectedPresetId: string | undefined;

function setStatus(message: string, isError = false): void {
  if (!statusElement) {
    return;
  }
  statusElement.textContent = message;
  statusElement.classList.toggle("status--error", isError);
}

function getSelectedPreset(): Preset | undefined {
  if (!appStorage) {
    return undefined;
  }
  if (!selectedPresetId) {
    return undefined;
  }
  return appStorage.presets.find((preset) => preset.id === selectedPresetId);
}

function sanitizeUrls(rawInput: string): string[] {
  return rawInput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function renderPresetList(): void {
  if (!presetListElement) {
    return;
  }
  if (!appStorage) {
    return;
  }

  presetListElement.innerHTML = "";

  if (appStorage.presets.length === 0) {
    const empty = document.createElement("li");
    empty.className = "preset-item";
    empty.textContent = "No sets yet.";
    presetListElement.append(empty);
    return;
  }

  for (const preset of appStorage.presets) {
    const listItem = document.createElement("li");
    listItem.className = "preset-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-item-button";
    if (preset.id === selectedPresetId) {
      button.classList.add("preset-item-button--active");
    }
    button.textContent = `${preset.name} (${preset.urls.length})`;
    button.addEventListener("click", () => {
      selectedPresetId = preset.id;
      renderAll();
    });

    listItem.append(button);
    presetListElement.append(listItem);
  }
}

function renderDefaultPresetSelect(): void {
  if (!defaultPresetSelect) {
    return;
  }
  if (!appStorage) {
    return;
  }

  defaultPresetSelect.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "None";
  defaultPresetSelect.append(noneOption);

  for (const preset of appStorage.presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    defaultPresetSelect.append(option);
  }

  defaultPresetSelect.value = appStorage.settings.defaultPresetId ?? "";
}

function renderEditor(): void {
  const selected = getSelectedPreset();
  const disabled = !selected;

  if (presetNameInput) {
    presetNameInput.disabled = disabled;
    presetNameInput.value = selected?.name ?? "";
  }
  if (urlsTextarea) {
    urlsTextarea.disabled = disabled;
    urlsTextarea.value = selected ? selected.urls.join("\n") : "";
  }
  if (savePresetButton) {
    savePresetButton.disabled = disabled;
  }
  if (deletePresetButton) {
    deletePresetButton.disabled = disabled;
  }
}

function renderAll(): void {
  renderPresetList();
  renderDefaultPresetSelect();
  renderEditor();
}

async function persist(statusMessage: string): Promise<void> {
  if (!appStorage) {
    return;
  }
  await saveAppStorage(appStorage);
  setStatus(statusMessage);
}

async function handleAddPreset(): Promise<void> {
  if (!newPresetNameInput || !appStorage) {
    return;
  }

  const fallbackName = `New Set ${appStorage.presets.length + 1}`;
  const preset = createPreset(newPresetNameInput.value.trim() || fallbackName);
  appStorage.presets.push(preset);
  selectedPresetId = preset.id;

  newPresetNameInput.value = "";
  renderAll();
  await persist("Added a new set.");
}

async function handleSavePreset(): Promise<void> {
  const selected = getSelectedPreset();
  if (!selected || !presetNameInput || !urlsTextarea) {
    return;
  }

  const nextName = presetNameInput.value.trim() || "Untitled Set";
  selected.name = nextName;
  selected.urls = sanitizeUrls(urlsTextarea.value);
  selected.updatedAt = Date.now();

  renderAll();
  await persist("Set saved.");
}

async function handleDeletePreset(): Promise<void> {
  const selected = getSelectedPreset();
  if (!selected || !appStorage) {
    return;
  }

  const shouldDelete = window.confirm(`Delete "${selected.name}"?`);
  if (!shouldDelete) {
    return;
  }

  appStorage.presets = appStorage.presets.filter((preset) => preset.id !== selected.id);

  if (appStorage.settings.defaultPresetId === selected.id) {
    appStorage.settings.defaultPresetId = undefined;
  }
  if (appStorage.settings.lastUsedPresetId === selected.id) {
    appStorage.settings.lastUsedPresetId = undefined;
  }

  selectedPresetId = appStorage.presets[0]?.id;
  renderAll();
  await persist("Set deleted.");
}

async function handleDefaultPresetChange(): Promise<void> {
  if (!defaultPresetSelect || !appStorage) {
    return;
  }

  const nextValue = defaultPresetSelect.value;
  appStorage.settings.defaultPresetId = nextValue || undefined;
  await persist("Default set saved.");
}

async function bootstrap(): Promise<void> {
  appStorage = await getAppStorage();
  selectedPresetId = appStorage.settings.defaultPresetId ?? appStorage.presets[0]?.id;
  renderAll();
}

if (addPresetButton) {
  addPresetButton.addEventListener("click", () => {
    void handleAddPreset();
  });
}

if (savePresetButton) {
  savePresetButton.addEventListener("click", () => {
    void handleSavePreset();
  });
}

if (deletePresetButton) {
  deletePresetButton.addEventListener("click", () => {
    void handleDeletePreset();
  });
}

if (defaultPresetSelect) {
  defaultPresetSelect.addEventListener("change", () => {
    void handleDefaultPresetChange();
  });
}

void bootstrap();
