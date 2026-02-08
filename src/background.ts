import { getAppStorage, saveAppStorage } from "./storage";
import { createTab, createWindow } from "./chrome-api";
import type { RunPresetRequest, RunPresetResult, RuntimeMessage } from "./types";

const QUICK_LAUNCH_COMMAND = "open_quick_launcher";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isRuntimeMessage(message: unknown): message is RuntimeMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const value = message as Partial<RuntimeMessage>;
  return value.type === "RUN_PRESET" && typeof value.payload?.presetId === "string";
}

function findUnsupportedUrls(urls: string[]): string[] {
  const unsupported: string[] = [];

  for (const candidate of urls) {
    try {
      const parsed = new URL(candidate);
      if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        unsupported.push(candidate);
      }
    } catch {
      unsupported.push(candidate);
    }
  }

  return unsupported;
}

async function runPreset(request: RunPresetRequest): Promise<RunPresetResult> {
  const storage = await getAppStorage();
  const preset = storage.presets.find((item) => item.id === request.presetId);

  if (!preset || preset.urls.length === 0) {
    return { ok: false, reason: "EMPTY_PRESET" };
  }

  const unsupportedUrls = findUnsupportedUrls(preset.urls);
  if (unsupportedUrls.length > 0 && storage.settings.stopOnUnsupportedScheme) {
    return {
      ok: false,
      reason: "UNSUPPORTED_SCHEME",
      detail: unsupportedUrls
    };
  }

  try {
    const createdWindow = await createWindow({
      url: preset.urls[0],
      focused: true
    });

    if (!createdWindow.id) {
      return {
        ok: false,
        reason: "TAB_CREATE_FAILED",
        detail: ["Unable to read the browser window ID."]
      };
    }

    for (const url of preset.urls.slice(1)) {
      await createTab({
        windowId: createdWindow.id,
        url,
        active: false
      });
    }

    storage.settings.lastUsedPresetId = preset.id;
    await saveAppStorage(storage);

    return {
      ok: true,
      windowId: createdWindow.id,
      openedCount: preset.urls.length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: "TAB_CREATE_FAILED",
      detail: [message]
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) {
    return false;
  }

  void runPreset(message.payload)
    .then((result) => {
      sendResponse(result);
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      const result: RunPresetResult = {
        ok: false,
        reason: "TAB_CREATE_FAILED",
        detail: [detail]
      };
      sendResponse(result);
    });

  return true;
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== QUICK_LAUNCH_COMMAND) {
    return;
  }

  void createTab({
    url: chrome.runtime.getURL("quick-launch.html")
  });
});
