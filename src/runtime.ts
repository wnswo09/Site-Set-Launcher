import type { RunPresetResult, RunPresetSource, RuntimeMessage } from "./types";
import { runtimeSendMessage } from "./chrome-api";

export async function runPresetById(presetId: string, source: RunPresetSource): Promise<RunPresetResult> {
  const message: RuntimeMessage = {
    type: "RUN_PRESET",
    payload: { presetId, source }
  };
  return runtimeSendMessage<RunPresetResult>(message);
}

export function formatRunError(result: Extract<RunPresetResult, { ok: false }>): string {
  if (result.reason === "EMPTY_PRESET") {
    return "This set is empty. Add URLs in the options page.";
  }

  if (result.reason === "UNSUPPORTED_SCHEME") {
    const details = result.detail?.length ? `\n- ${result.detail.join("\n- ")}` : "";
    return `Unsupported URL(s) found. Run was canceled.${details}`;
  }

  if (result.reason === "TAB_CREATE_FAILED") {
    const detail = result.detail?.[0] ? ` (${result.detail[0]})` : "";
    return `Failed to create tabs.${detail}`;
  }

  return "An unknown error occurred.";
}
