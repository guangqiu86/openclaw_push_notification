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
 * Plugin configuration from openclaw.json
 */
export interface PluginConfig {
  enabled?: boolean;
  config?: PushNotificationConfig;
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
