import type { PluginEntryConfig, PushPluginApiConfig } from './types';

/**
 * Resolve this plugin entry from OpenClaw config.
 * Canonical key is "push-notification"; legacy keys are supported.
 */
export function resolvePushPluginEntry(config: PushPluginApiConfig): PluginEntryConfig | undefined {
  const entries = config.plugins?.entries;
  if (!entries) {
    return undefined;
  }
  return (
    entries['push-notification'] ??
    entries['openclaw-push-notification'] ??
    entries.push_notification
  );
}
