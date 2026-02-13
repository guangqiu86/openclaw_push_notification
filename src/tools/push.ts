/**
 * Push Notification Tool for OpenClaw
 *
 * This tool allows agents to send push notifications to users when:
 * - A task completes
 * - A cron job triggers
 * - User attention is required
 * - Any other event that warrants notification
 *
 * The tool sends notifications via a configurable backend service,
 * which can then deliver to various platforms (React Native/Expo, web, etc.)
 */

import { z } from 'zod';
import type { PushNotificationConfig, PushNotificationPayload, PushNotificationResult } from '../types';

// Schema for tool input validation
const PushSchema = z.object({
  message: z.string().min(1).describe('The notification message to send to the user'),
  title: z.string().optional().describe('Optional notification title. Defaults to configured defaultTitle'),
  data: z.record(z.unknown()).optional().describe('Optional additional data payload to include with the notification'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Notification priority: low, normal, or high'),
});

type PushInput = z.infer<typeof PushSchema>;

/**
 * Register the push notification tool with OpenClaw
 */
export function registerPushTool(api: {
  registerTool: (options: {
    tool: {
      name: string;
      description: string;
      schema: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
      };
    };
    handler: (input: unknown) => Promise<PushNotificationResult>;
  }) => void;
  config: {
    plugins?: {
      entries?: {
        push_notification?: {
          config?: PushNotificationConfig;
        };
      };
    };
  };
}): void {
  const tool = {
    name: 'push',
    description: `Send a push notification to the user. Use this tool when:
- A requested task has completed
- A cron job has triggered
- The agent needs to alert the user about something important
- Any event that warrants notifying the user

The notification will be delivered to the user's registered device(s).`,
    schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string' as const,
          description: 'The notification message to send to the user',
        },
        title: {
          type: 'string' as const,
          description: 'Optional notification title. Defaults to configured defaultTitle',
        },
        data: {
          type: 'object' as const,
          description: 'Optional additional data payload to include with the notification (key-value pairs)',
        },
        priority: {
          type: 'string' as const,
          enum: ['low', 'normal', 'high'],
          default: 'normal',
          description: 'Notification priority: low, normal, or high',
        },
      },
      required: ['message'],
    },
  };

  api.registerTool({
    tool,
    handler: async (input: unknown): Promise<PushNotificationResult> => {
      // Validate input
      const params = PushSchema.parse(input);

      // Get plugin configuration from openclaw.json
      const pluginConfig = api.config.plugins?.entries?.push_notification?.config;

      // Check if plugin is configured
      if (!pluginConfig?.backendUrl) {
        return {
          success: false,
          error: 'Push notification plugin not configured. Set plugins.entries.push_notification.config.backendUrl in openclaw.json',
        };
      }

      // Check if plugin is disabled
      if (pluginConfig.enabled === false) {
        return {
          success: false,
          error: 'Push notification plugin is disabled',
        };
      }

      // Build the notification payload
      const payload: PushNotificationPayload = {
        message: params.message,
        title: params.title || pluginConfig.defaultTitle || 'OpenClaw Agent',
        data: params.data || {},
        priority: params.priority,
        // Include jobId from environment if available (set during deployment)
        jobId: process.env.OPENCLAW_JOB_ID || process.env.JOB_ID || 'unknown',
        // Include agent info from environment
        agentId: process.env.OPENCLAW_AGENT_ID || process.env.AGENT_ID || 'unknown',
        timestamp: new Date().toISOString(),
      };

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (pluginConfig.apiKey) {
        headers['Authorization'] = `Bearer ${pluginConfig.apiKey}`;
      }

      try {
        // Send notification to backend
        const response = await fetch(`${pluginConfig.backendUrl}/api/notifications/send`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorBody = (await response.json()) as { error?: string; message?: string };
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          } catch {
            // Response wasn't JSON, use status text
            errorMessage = `${response.status} ${response.statusText}`;
          }

          return {
            success: false,
            error: `Failed to send notification: ${errorMessage}`,
          };
        }

        const result = await response.json();
        return {
          success: true,
          result,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          error: `Failed to send notification: ${errorMessage}`,
        };
      }
    },
  });
}
