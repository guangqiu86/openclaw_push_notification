# @openclaw/push-notification

Push notification plugin for OpenClaw agents. Enables agents to send push notifications to users when tasks complete, cron jobs trigger, or user attention is required.

## Features

- **Easy to Use**: Simple `/push` tool that agents can call
- **Configurable Backend**: Point to any notification service
- **Extensible**: Designed to support multiple notification backends
- **React Native Ready**: Works with Expo Push Notifications out of the box

## Installation

```bash
npm install -g @openclaw/push-notification
```

## Configuration

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "push-notification": {
        "enabled": true,
        "config": {
          "backendUrl": "https://your-backend.com",
          "apiKey": "your-api-key",
          "defaultTitle": "OpenClaw Agent"
        }
      }
    }
  }
}
```

## Usage

Agents can send notifications using the `push` tool:

```
/push --message "Task completed successfully!"
/push --message "Error occurred" --title "Alert" --priority high
/push --message "Daily summary ready" --data '{"jobId": "123"}'
```

## Backend API

The plugin sends notifications to a configurable backend. Your backend should implement:

### POST /api/notifications/send

Request:
```json
{
  "message": "Task completed!",
  "title": "OpenClaw Agent",
  "data": { "jobId": "abc123" },
  "priority": "normal",
  "jobId": "abc123",
  "agentId": "agent-001",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Response:
```json
{
  "success": true,
  "receiptId": "xxx"
}
```

## For React Native / Expo Apps

See the [Expo Push Notifications documentation](https://docs.expo.dev/push-notifications/overview/) for setting up your mobile app to receive notifications.

## License

MIT
