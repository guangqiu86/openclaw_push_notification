import { describe, expect, it } from 'vitest';
import { resolvePushPluginEntry } from './config';
import type { PushPluginApiConfig } from './types';

describe('resolvePushPluginEntry', () => {
  it('prefers canonical key when multiple keys are present', () => {
    const canonical = { enabled: true, config: { backendUrl: 'https://canonical.example' } };
    const packageKey = { enabled: true, config: { backendUrl: 'https://package.example' } };

    const config: PushPluginApiConfig = {
      plugins: {
        entries: {
          'push-notification': canonical,
          'openclaw-push-notification': packageKey,
          push_notification: { enabled: true, config: { backendUrl: 'https://legacy.example' } },
        },
      },
    };

    expect(resolvePushPluginEntry(config)).toBe(canonical);
  });

  it('falls back to package-name key when canonical key is missing', () => {
    const packageKey = { enabled: true, config: { backendUrl: 'https://package.example' } };
    const config: PushPluginApiConfig = {
      plugins: {
        entries: {
          'openclaw-push-notification': packageKey,
        },
      },
    };

    expect(resolvePushPluginEntry(config)).toBe(packageKey);
  });

  it('falls back to legacy key when newer keys are missing', () => {
    const legacy = { enabled: true, config: { backendUrl: 'https://legacy.example' } };
    const config: PushPluginApiConfig = {
      plugins: {
        entries: {
          push_notification: legacy,
        },
      },
    };

    expect(resolvePushPluginEntry(config)).toBe(legacy);
  });

  it('returns undefined when entries are missing', () => {
    expect(resolvePushPluginEntry({})).toBeUndefined();
  });
});
