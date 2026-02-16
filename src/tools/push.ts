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
import { resolvePushPluginEntry } from '../config';
import type {
  OpenClawAgentTool,
  PushNotificationPayload,
  PushNotificationResult,
  PushPluginApiConfig,
  ToolExecutionResult,
} from '../types';

// Schema for tool input validation
const PushSchema = z.object({
  message: z.string().min(1).describe('The notification message to send to the user'),
  title: z.string().optional().describe('Optional notification title. Defaults to configured defaultTitle'),
  data: z.record(z.unknown()).optional().describe('Optional additional data payload to include with the notification'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Notification priority: low, normal, or high'),
});

type PushInput = z.infer<typeof PushSchema>;

type PushToolApi = {
  registerTool: (
    tool: OpenClawAgentTool<unknown, PushNotificationResult>,
    opts?: { name?: string; names?: string[]; optional?: boolean }
  ) => void;
  config: PushPluginApiConfig;
};

function readErrorMessageFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const payload = body as { error?: unknown; message?: unknown };
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return undefined;
}

function formatToolText(result: PushNotificationResult): string {
  if (result.success) {
    return 'Push notification sent successfully.';
  }
  return `Push notification failed: ${result.error ?? 'Unknown error'}`;
}

async function executePush(
  params: PushInput,
  config: PushPluginApiConfig,
  signal?: AbortSignal
): Promise<PushNotificationResult> {
  // Get plugin configuration from openclaw.json.
  const pluginEntry = resolvePushPluginEntry(config);
  const pluginConfig = pluginEntry?.config;

  // Check if plugin is disabled at entry-level or config-level.
  if (pluginEntry?.enabled === false || pluginConfig?.enabled === false) {
    return {
      success: false,
      error: 'Push notification plugin is disabled',
    };
  }

  // Check if plugin is configured.
  if (!pluginConfig?.backendUrl) {
    return {
      success: false,
      error: 'Push notification plugin not configured. Set plugins.entries["push-notification"].config.backendUrl in openclaw.json',
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
    const backendUrl = pluginConfig.backendUrl.replace(/\/+$/, '');
    const response = await fetch(`${backendUrl}/api/notifications/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as unknown;
        errorMessage = readErrorMessageFromBody(errorBody) || errorMessage;
      } catch {
        // Response wasn't JSON, use status text.
      }

      return {
        success: false,
        error: `Failed to send notification: ${errorMessage}`,
      };
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      result = { success: true };
    }

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
}

/**
 * Register the push notification tool with OpenClaw
 */
export function registerPushTool(api: {
  registerTool: PushToolApi['registerTool'];
  config: PushPluginApiConfig;
}): void {
  const tool: OpenClawAgentTool<unknown, PushNotificationResult> = {
    name: 'push',
    label: 'Push Notification',
    description: `Send a push notification to the user. Use this tool when:
- A requested task has completed
- A cron job has triggered
- The agent needs to alert the user about something important
- Any event that warrants notifying the user

The notification will be delivered to the user's registered device(s).`,
    parameters: {
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
      additionalProperties: false,
    },
    execute: async (
      _toolCallId: string,
      input: unknown,
      signal?: AbortSignal
    ): Promise<ToolExecutionResult<PushNotificationResult>> => {
      // Validate input
      const params = PushSchema.parse(input);

      const details = await executePush(params, api.config, signal);
      return {
        content: [{ type: 'text', text: formatToolText(details) }],
        details,
      };
    },
  };

  api.registerTool(tool);
}
