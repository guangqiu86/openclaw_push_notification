import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpenClawAgentTool, PushNotificationResult, PushPluginApiConfig } from '../types';
import { registerPushTool } from './push';

type PushTool = OpenClawAgentTool<unknown, PushNotificationResult>;

const originalFetch = globalThis.fetch;
const originalJobId = process.env.OPENCLAW_JOB_ID;
const originalAgentId = process.env.OPENCLAW_AGENT_ID;

function createRegisteredTool(config: PushPluginApiConfig): PushTool {
  let tool: PushTool | undefined;
  registerPushTool({
    config,
    registerTool: (registeredTool) => {
      tool = registeredTool;
    },
  });
  if (!tool) {
    throw new Error('Push tool was not registered');
  }
  return tool;
}

describe('push tool', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENCLAW_JOB_ID = originalJobId;
    process.env.OPENCLAW_AGENT_ID = originalAgentId;
    vi.restoreAllMocks();
  });

  it('registers tool metadata in OpenClaw format', () => {
    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': { config: { backendUrl: 'https://notify.example' } },
        },
      },
    });

    expect(tool.name).toBe('push');
    expect(tool.label).toBe('Push Notification');
    expect(tool.parameters).toMatchObject({
      type: 'object',
      required: ['message'],
      additionalProperties: false,
    });
  });

  it('returns a structured failure when plugin is disabled', async () => {
    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': {
            enabled: false,
            config: { backendUrl: 'https://notify.example' },
          },
        },
      },
    });

    const result = await tool.execute('tool-call-1', { message: 'Task completed' });

    expect(result.details).toMatchObject({
      success: false,
      error: 'Push notification plugin is disabled',
    });
    expect(result.content[0]?.text).toContain('failed');
  });

  it('returns a structured failure when backend URL is missing', async () => {
    const tool = createRegisteredTool({});

    const result = await tool.execute('tool-call-1', { message: 'Task completed' });

    expect(result.details.success).toBe(false);
    expect(result.details.error).toContain('not configured');
  });

  it('sends payload to backend and returns success details', async () => {
    process.env.OPENCLAW_JOB_ID = 'job-123';
    process.env.OPENCLAW_AGENT_ID = 'agent-xyz';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, receiptId: 'receipt-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': {
            config: {
              backendUrl: 'https://notify.example/',
              apiKey: 'secret-key',
              defaultTitle: 'Agent Default',
            },
          },
        },
      },
    });

    const result = await tool.execute('tool-call-1', { message: 'Task completed' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://notify.example/api/notifications/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-key',
    });

    const payload = JSON.parse(String(init.body));
    expect(payload).toMatchObject({
      message: 'Task completed',
      title: 'Agent Default',
      data: {},
      priority: 'normal',
      jobId: 'job-123',
      agentId: 'agent-xyz',
    });
    expect(typeof payload.timestamp).toBe('string');

    expect(result.details).toEqual({
      success: true,
      result: { success: true, receiptId: 'receipt-1' },
    });
    expect(result.content[0]?.text).toContain('sent successfully');
  });

  it('returns backend error details when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Backend unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': {
            config: { backendUrl: 'https://notify.example' },
          },
        },
      },
    });

    const result = await tool.execute('tool-call-1', { message: 'Task completed' });

    expect(result.details.success).toBe(false);
    expect(result.details.error).toContain('Backend unavailable');
    expect(result.content[0]?.text).toContain('failed');
  });

  it('returns network error details when fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': {
            config: { backendUrl: 'https://notify.example' },
          },
        },
      },
    });

    const result = await tool.execute('tool-call-1', { message: 'Task completed' });

    expect(result.details.success).toBe(false);
    expect(result.details.error).toContain('ECONNREFUSED');
  });

  it('validates input and rejects empty message values', async () => {
    const tool = createRegisteredTool({
      plugins: {
        entries: {
          'push-notification': {
            config: { backendUrl: 'https://notify.example' },
          },
        },
      },
    });

    await expect(tool.execute('tool-call-1', { message: '' })).rejects.toBeInstanceOf(Error);
  });
});
