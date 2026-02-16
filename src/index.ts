/**
 * OpenClaw Push Notification Plugin
 *
 * A plugin that enables OpenClaw agents to send push notifications to users.
 * Supports various notification backends including Expo Push Notifications for React Native.
 *
 * Installation:
 *   npm install -g openclaw-push-notification
 *
 * Configuration (in openclaw.json):
 *   {
 *     "plugins": {
 *       "enabled": true,
 *       "entries": {
 *         "push-notification": {
 *           "enabled": true,
 *           "config": {
 *             "backendUrl": "https://your-backend.com",
 *             "apiKey": "your-api-key",
 *             "defaultTitle": "OpenClaw Agent"
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * Usage in agent:
 *   /push --message "Task completed!"
 *   /push --message "Error occurred" --title "Alert" --priority high
 */

import { registerPushTool } from './tools/push';
import { resolvePushPluginEntry } from './config';
import type {
  OpenClawAgentTool,
  PushNotificationConfig,
  PushNotificationResult,
  PushPluginApiConfig,
} from './types';

/**
 * Plugin registration function
 * This is the entry point that OpenClaw will call
 */
function registerPlugin(api: {
  registerTool: (
    tool: OpenClawAgentTool<unknown, PushNotificationResult>,
    opts?: { name?: string; names?: string[]; optional?: boolean }
  ) => void;
  registerCli?: (setup: (program: { program: { command: (name: string) => { description: (desc: string) => { action: (handler: () => Promise<void>) => void } } } }) => void, options: { commands: string[] }) => void;
  config: PushPluginApiConfig;
}): void {
  // Register the push notification tool
  registerPushTool(api);

  // Optionally register CLI commands for testing
  if (api.registerCli) {
    api.registerCli(
      ({ program }) => {
        program
          .command('push-notification:test')
          .description('Test push notification configuration')
          .action(async () => {
            const entry = resolvePushPluginEntry(api.config);
            const config = entry?.config;

            if (!config?.backendUrl) {
              console.log('Push notification plugin is not configured.');
              console.log('Set plugins.entries["push-notification"].config.backendUrl in openclaw.json');
              return;
            }

            if (entry?.enabled === false || config.enabled === false) {
              console.log('Push notification plugin is disabled.');
              return;
            }

            console.log('Push notification plugin is configured!');
            console.log('Backend URL:', config.backendUrl);
            console.log('Default Title:', config.defaultTitle || 'OpenClaw Agent');
          });
      },
      { commands: ['push-notification:test'] }
    );
  }
}

export default registerPlugin;
export { registerPushTool };
export type { PushNotificationConfig, PushNotificationResult };
