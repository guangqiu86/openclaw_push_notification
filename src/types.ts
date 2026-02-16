/**
 * Types for the OpenClaw Push Notification Plugin
 */

export interface PushNotificationConfig {
  backendUrl: string;
  apiKey?: string;
  defaultTitle?: string;
  enabled?: boolean;
}

export interface PushNotificationInput {
  message: string;
  title?: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}

export interface PushNotificationPayload {
  message: string;
  title: string;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
  jobId?: string;
  agentId?: string;
  timestamp: string;
}

export interface PushNotificationResult {
  success: boolean;
  result?: unknown;
  error?: string;
  code?: string;
}

export interface PushNotificationResponse {
  success: boolean;
  receiptId?: string;
  error?: string;
  details?: string;
  code?: string;
}

/**
 * Plugin entry under plugins.entries in openclaw.json
 */
export interface PluginEntryConfig {
  enabled?: boolean;
  config?: PushNotificationConfig;
}

/**
 * Backward-compatible alias used by existing imports.
 */
export type PluginConfig = PluginEntryConfig;

/**
 * Relevant OpenClaw config shape for this plugin.
 */
export interface PushPluginApiConfig {
  plugins?: {
    entries?: {
      'push-notification'?: PluginEntryConfig;
      'openclaw-push-notification'?: PluginEntryConfig; // package-name key
      push_notification?: PluginEntryConfig; // legacy key, kept for compatibility
      [key: string]: PluginEntryConfig | undefined;
    };
  };
}

/**
 * Tool execution context from OpenClaw
 */
export interface ToolExecutionContext {
  agentId?: string;
  sessionId?: string;
  channelId?: string;
  userId?: string;
}

/**
 * Minimal text payload shape expected by OpenClaw agent tools.
 */
export interface ToolTextContent {
  type: 'text';
  text: string;
}

/**
 * Minimal tool execution result shape for plugin tools.
 */
export interface ToolExecutionResult<TDetails = unknown> {
  content: ToolTextContent[];
  details: TDetails;
}

/**
 * Minimal OpenClaw agent tool shape used by this plugin.
 */
export interface OpenClawAgentTool<TParams = unknown, TDetails = unknown> {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute: (toolCallId: string, params: TParams, signal?: AbortSignal) => Promise<ToolExecutionResult<TDetails>>;
}
