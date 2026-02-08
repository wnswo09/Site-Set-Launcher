import type { AppStorageV1, Preset } from "./types";
import { storageSyncGet, storageSyncSet } from "./chrome-api";

const STORAGE_KEY = "app_storage_v1";
const STORAGE_VERSION = 1 as const;

const DEFAULT_SETTINGS = {
  stopOnUnsupportedScheme: true as const
};

function now(): number {
  return Date.now();
}

export function createPreset(name: string): Preset {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "New Set",
    urls: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createDefaultStorage(): AppStorageV1 {
  return {
    version: STORAGE_VERSION,
    presets: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

function normalizePreset(rawPreset: unknown): Preset | null {
  if (!rawPreset || typeof rawPreset !== "object") {
    return null;
  }

  const value = rawPreset as Partial<Preset>;
  const timestamp = now();
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Untitled Set";
  const urls = Array.isArray(value.urls) ? value.urls.filter((entry): entry is string => typeof entry === "string") : [];

  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    name,
    urls,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : timestamp,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : timestamp
  };
}

function normalizeStorage(rawStorage: unknown): AppStorageV1 {
  if (!rawStorage || typeof rawStorage !== "object") {
    return createDefaultStorage();
  }

  const value = rawStorage as Partial<AppStorageV1>;
  const normalizedPresets = Array.isArray(value.presets)
    ? value.presets.map((preset) => normalizePreset(preset)).filter((preset): preset is Preset => preset !== null)
    : [];

  const validPresetIds = new Set(normalizedPresets.map((preset) => preset.id));
  const defaultPresetId =
    typeof value.settings?.defaultPresetId === "string" && validPresetIds.has(value.settings.defaultPresetId)
      ? value.settings.defaultPresetId
      : undefined;
  const lastUsedPresetId =
    typeof value.settings?.lastUsedPresetId === "string" && validPresetIds.has(value.settings.lastUsedPresetId)
      ? value.settings.lastUsedPresetId
      : undefined;

  return {
    version: STORAGE_VERSION,
    presets: normalizedPresets,
    settings: {
      defaultPresetId,
      lastUsedPresetId,
      stopOnUnsupportedScheme: true
    }
  };
}

export async function getAppStorage(): Promise<AppStorageV1> {
  const rawStorage = await storageSyncGet<unknown>(STORAGE_KEY);

  if (!rawStorage) {
    const defaults = createDefaultStorage();
    await storageSyncSet({ [STORAGE_KEY]: defaults });
    return defaults;
  }

  if (typeof rawStorage === "object" && rawStorage !== null && (rawStorage as Partial<AppStorageV1>).version === STORAGE_VERSION) {
    return normalizeStorage(rawStorage);
  }

  const normalized = normalizeStorage(rawStorage);
  await storageSyncSet({ [STORAGE_KEY]: normalized });
  return normalized;
}

export async function saveAppStorage(nextStorage: AppStorageV1): Promise<void> {
  const normalized = normalizeStorage(nextStorage);
  await storageSyncSet({ [STORAGE_KEY]: normalized });
}
