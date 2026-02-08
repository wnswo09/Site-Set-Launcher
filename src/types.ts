export type PresetId = string;

export interface Preset {
  id: PresetId;
  name: string;
  urls: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  defaultPresetId?: PresetId;
  lastUsedPresetId?: PresetId;
  stopOnUnsupportedScheme: true;
}

export interface AppStorageV1 {
  version: 1;
  presets: Preset[];
  settings: Settings;
}

export type RunPresetSource = "popup" | "quick-launch";

export interface RunPresetRequest {
  presetId: PresetId;
  source: RunPresetSource;
}

export type RunPresetResult =
  | {
      ok: true;
      windowId: number;
      openedCount: number;
    }
  | {
      ok: false;
      reason: "EMPTY_PRESET" | "UNSUPPORTED_SCHEME" | "TAB_CREATE_FAILED";
      detail?: string[];
    };

export type RuntimeMessage = {
  type: "RUN_PRESET";
  payload: RunPresetRequest;
};
