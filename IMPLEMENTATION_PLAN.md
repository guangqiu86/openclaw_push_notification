# OpenClaw Push Notification Plugin - Implementation Plan

## Overview

This document outlines the implementation plan for a push notification plugin for OpenClaw agents. The plugin enables deployed agents to send push notifications to users when tasks complete or when user attention is required.

**Repository:** https://github.com/guangqiu86/openclaw_push_notification

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PUSH NOTIFICATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────────────┐  │
│  │   Mobile     │    │   Your Backend  │    │   Deployed Agent (ECS)   │  │
│  │   App        │    │   (Next.js)     │    │   (OpenClaw Gateway)     │  │
│  └──────┬───────┘    └────────┬────────┘    └────────────┬─────────────┘  │
│         │                      │                          │                 │
│         │ 1. Push Token        │                          │                 │
│         │─────────────────────>│                          │                 │
│         │                      │                          │                 │
│         │                      │    2. User initiates     │                 │
│         │                      │    task/deployment       │                 │
│         │                      │<─────────────────────────│                 │
│         │                      │                          │                 │
│         │                      │                          │ 3. Agent calls  │
│         │                      │                          │  push tool      │
│         │                      │                          │────────────────>│
│         │                      │                          │                 │
│         │    4. Push           │                          │                 │
│         │<─────────────────────│                          │                 │
│         │    Notification      │                          │                 │
│         │                      │                          │                 │
│  └──────┴───────┘    ┌────────┴────────┐    └────────────┴─────────────┘  │
│                      │                 │                                    │
│                      │  Expo Push API  │                                    │
│                      │ (FCM + APNs)   │                                    │
│                      └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. OpenClaw Plugin (`@openclaw/push-notification`)

**Purpose:** A plugin that registers a `push` tool in OpenClaw agents.

**Features:**
- Register a `push` tool that agents can call
- Configurable backend URL for notification delivery
- Support for custom title, message, priority, and data payload
- API key authentication with backend

### 2. Backend API Extensions

**Purpose:** Handle notification delivery to mobile apps.

**Endpoints:**
- `POST /api/notifications/register` - Register push token from mobile app
- `POST /api/notifications/send` - Send notification (called by plugin)
- `GET /api/notifications/status` - Check delivery status

### 3. Mobile App Integration

**Purpose:** Receive push notifications in the React Native app.

**Features:**
- Request push notification permissions
- Register for Expo Push Token
- Handle incoming notifications
- Navigate to relevant screens based on notification data

### 4. Cloud-Init Integration

**Purpose:** Automatically install and configure the plugin on deployed agents.

**Features:**
- Install plugin during ECS instance bootstrap
- Configure backend URL and API key
- No manual setup required for users

## File Structure

```
openclaw-push-notification/          # GitHub repo - the plugin
├── package.json
├── openclaw.plugin.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── tools/
│   │   └── push.ts
│   └── types.ts
├── README.md
├── LICENSE
└── .github/
    └── workflows/
        └── publish.yml

OpenClaw_one_click/                  # Your main app
├── app/
│   └── api/
│       └── notifications/
│           ├── register/
│           │   └── route.ts
│           └── send/
│               └── route.ts
├── lib/
│   ├── deploy/
│   │   ├── cloudInit.ts       # Modified
│   │   └── store.ts           # Modified
│   └── types.ts               # Modified
└── mobile/
    └── yidiantong/
        └── app/
            └── _layout.tsx     # Modified
```

## Implementation Steps

### Step 1: Create OpenClaw Plugin Package

Create the following files in the GitHub repo:

1. `package.json` - NPM package configuration
2. `openclaw.plugin.json` - Plugin manifest
3. `src/index.ts` - Plugin entry point
4. `src/tools/push.ts` - Push notification tool implementation
5. `src/types.ts` - TypeScript types

### Step 2: Add Backend API Endpoints

Create in your Next.js app:

1. `app/api/notifications/register/route.ts` - Token registration
2. `app/api/notifications/send/route.ts` - Notification delivery
3. Install `expo-server-sdk` package

### Step 3: Update Mobile App

Modify `mobile/yidiantong/app/_layout.tsx`:

1. Install `expo-notifications` and `expo-device`
2. Add permission request and token registration
3. Add notification received handler

### Step 4: Update Cloud-Init Script

Modify `lib/deploy/cloudInit.ts`:

1. Add plugin installation command
2. Add plugin configuration to openclaw.json

### Step 5: Update Deployment Store

Modify `lib/deploy/store.ts` and `lib/types.ts`:

1. Add `expoPushToken` field to deployment records
2. Add helper functions for push token management

## Extensibility

The plugin is designed to support multiple notification backends:

### Current: Expo Push Notifications
- Uses Expo Push API (wraps FCM/APNs)
- Optimized for React Native apps

### Future Extensibility:
- **Firebase Cloud Messaging** - Direct FCM integration
- **OneSignal** - Third-party push service
- **Pusher** - Real-time messaging
- **Custom WebSocket** - For non-mobile platforms
- **Email** - SMTP integration
- **SMS** - Twilio integration

The backend URL configuration makes it easy to switch between notification providers without changing the plugin code.

## Configuration

### Plugin Configuration (openclaw.json)

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

### Agent Usage

Agents can send notifications using:

```
/push --message "Task completed successfully!"
/push --message "Error occurred" --title "Alert" --priority high
/push --message "Daily summary ready" --data '{"jobId": "123"}'
```

## Security Considerations

1. **API Key Authentication** - All requests to backend are authenticated
2. **Token Validation** - Validate Expo push tokens before sending
3. **User Association** - Push tokens linked to authenticated users
4. **Rate Limiting** - Implement rate limiting on notification endpoints
5. **Input Validation** - Sanitize all user inputs

## Testing

### Unit Tests
- Plugin tool schema validation
- API endpoint request/response handling
- Push token management

### Integration Tests
- End-to-end notification flow
- Cloud-init plugin installation
- Mobile app notification handling

## Deployment

1. Publish plugin to npm: `npm publish`
2. Deploy backend with notification endpoints
3. Deploy mobile app with push notification support
4. Users get one-click deployment with push notifications enabled
