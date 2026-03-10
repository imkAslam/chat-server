# Chat Server

A pluggable, real-time chat server built with **Socket.IO** and **Express**. Supports direct messages, ephemeral rooms, persistent groups, and push notifications. Use it as an **importable library** inside your existing app or run it as a **standalone microservice**.

## Features

- **Direct messaging** (1:1) with typing indicators and read receipts
- **Ephemeral rooms** — join/leave freely, no persistence
- **Persistent groups** — membership, roles (owner/admin/member), stored messages, invite/kick
- **Push notifications** — targeted and broadcast
- **UUID v7** — time-sortable IDs on every message, group, and notification
- **Pluggable adapters** — cache, persistence, and event queue (in-memory defaults, Redis ready)
- **Payload encryption** — AES-256-GCM via Node.js crypto (optional)
- **JWT + custom auth** — built-in JWT middleware with custom hook fallback
- **Rate limiting** — per-socket sliding window
- **Input validation** — schema-checked payloads on all events
- **Graceful shutdown** — SIGTERM/SIGINT handling with connection draining
- **Docker ready** — Dockerfile + Compose with optional Redis

## Quick Start

### Prerequisites

- Node.js >= 18
- npm

### Install and Run

```bash
git clone https://github.com/imkAslam/chat-server.git
cd chat-server
npm install
cp .env.example .env
npm start
```

The server starts on `http://localhost:5030` by default. Hit `/health` to verify.

### Development

```bash
npm run dev   # nodemon with --inspect
```

## Usage

### Standalone Mode

Run `npm start` (or `node src/server.js`). Configure via environment variables — see `.env.example` for the full list.

### Library Mode

Install in your project:

```bash
npm install chat-server
```

Attach to an existing HTTP server:

```javascript
const http = require("http");
const express = require("express");
const { ChatServer } = require("chat-server");

const app = express();
const server = http.createServer(app);

const chat = new ChatServer({
  server,                              // attach to your server
  cors: { origin: ["http://localhost:3000"] },
  auth: {
    enabled: true,
    jwtSecret: process.env.JWT_SECRET,
  },
  encryption: {
    enabled: true,
    secret: process.env.ENCRYPTION_SECRET,
  },
});

chat.start();

server.listen(3000, () => {
  console.log("App + Chat running on :3000");
});
```

Or create a standalone instance:

```javascript
const { ChatServer } = require("chat-server");

const chat = new ChatServer({ port: 5030 });
chat.start();
```

## Adapters

Every adapter has an in-memory default. Swap in Redis (or your own) without changing application code.

### Cache Adapter

Controls user-to-socket mapping and ephemeral state.

```javascript
const { ChatServer, RedisCacheAdapter } = require("chat-server");
const Redis = require("ioredis");

const chat = new ChatServer({
  cache: new RedisCacheAdapter(new Redis(), { prefix: "myapp:" }),
});
```

**Custom adapter**: extend `CacheAdapter` and implement `get`, `set`, `del`, `has`, `keys`, `clear`.

### Persistence Adapter

Stores messages and group data.

```javascript
const { ChatServer, PersistenceAdapter } = require("chat-server");

class MongoPersistenceAdapter extends PersistenceAdapter {
  async saveMessage(message) { /* ... */ }
  async getMessages(channelId, opts) { /* ... */ }
  async saveGroup(group) { /* ... */ }
  async getGroup(groupId) { /* ... */ }
  async updateGroup(groupId, data) { /* ... */ }
  async deleteGroup(groupId) { /* ... */ }
  async addGroupMember(groupId, member) { /* ... */ }
  async removeGroupMember(groupId, userId) { /* ... */ }
  async getGroupsByUser(userId) { /* ... */ }
}

const chat = new ChatServer({
  persistence: new MongoPersistenceAdapter(),
});
```

### Queue Adapter

Decouples event processing. Use Redis Pub/Sub for multi-instance scaling.

```javascript
const { ChatServer, RedisQueueAdapter } = require("chat-server");
const Redis = require("ioredis");

const chat = new ChatServer({
  queue: new RedisQueueAdapter(new Redis(), new Redis(), { prefix: "myapp:" }),
});
```

## Socket.IO Events

### Direct Messaging

| Client emits      | Payload                         | Server emits     | Description                  |
|--------------------|---------------------------------|------------------|------------------------------|
| `dm:send`          | `{ to, content }`              | `dm:received`    | Send a direct message        |
| `dm:typing`        | `{ to }`                       | `dm:typing`      | Typing indicator             |
| `dm:read`          | `{ to, messageId }`            | `dm:read`        | Read receipt                 |

### Ephemeral Rooms

| Client emits       | Payload                         | Server emits     | Description                  |
|---------------------|---------------------------------|------------------|------------------------------|
| `room:join`         | `{ room, name }`               | `room:message`   | Join a room                  |
| `room:leave`        | `{ room }`                     | `room:message`   | Leave a room                 |
| `room:message`      | `{ room, content }`            | `room:message`   | Send message to room         |
| `room:members`      | `{ room }`                     | `room:members`   | Get room member list         |

### Persistent Groups

| Client emits        | Payload                         | Server emits      | Description                 |
|----------------------|---------------------------------|-------------------|-----------------------------|
| `group:create`       | `{ name }`                     | `group:created`   | Create a group              |
| `group:join`         | `{ groupId }`                  | `group:joined`    | Join a group                |
| `group:leave`        | `{ groupId }`                  | `group:left`      | Leave a group               |
| `group:message`      | `{ groupId, content }`         | `group:message`   | Send message to group       |
| `group:members`      | `{ groupId }`                  | `group:members`   | Get group members           |
| `group:invite`       | `{ groupId, userId }`          | `group:invited`   | Invite user (admin+)        |
| `group:kick`         | `{ groupId, userId }`          | `group:kicked`    | Kick user (admin+)          |

### Notifications

| Client emits              | Payload                    | Server emits              | Description              |
|---------------------------|----------------------------|---------------------------|--------------------------|
| `notification:send`       | `{ to, title, body }`     | `notification:received`   | Targeted notification    |
| `notification:broadcast`  | `{ title, body }`         | `notification:received`   | Broadcast to all         |

## Authentication

Connect with a JWT token:

```javascript
const socket = io("http://localhost:5030", {
  auth: { token: "your.jwt.token" },
});
```

Or provide a `userId` for custom auth:

```javascript
const socket = io("http://localhost:5030", {
  auth: { userId: "user-123" },
});
```

Custom auth hook on the server:

```javascript
const chat = new ChatServer({
  auth: {
    enabled: true,
    customAuth: (socket, next) => {
      const apiKey = socket.handshake.auth.apiKey;
      if (isValidKey(apiKey)) {
        socket.user = { id: lookupUser(apiKey) };
        return next();
      }
      next(new Error("Invalid API key"));
    },
  },
});
```

## Encryption

When enabled, message content is encrypted with AES-256-GCM before storage and transmission:

```javascript
const chat = new ChatServer({
  encryption: {
    enabled: true,
    secret: "a-strong-secret-key-at-least-32-chars",
    salt: "optional-custom-salt",
  },
});
```

## Configuration

All options with defaults:

```javascript
{
  port: 5030,
  cors: { origin: [], methods: ["GET", "POST"], credentials: true },
  socketIO: {
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
    transports: ["websocket", "polling"],
  },
  auth: { enabled: false, jwtSecret: "", customAuth: null },
  encryption: { enabled: false, secret: "", salt: "chat-server-default-salt" },
  rateLimit: { enabled: true, windowMs: 1000, maxEvents: 50 },
  maxMessageSize: 4096,
  gracefulShutdownTimeoutMs: 10000,
  logging: { level: "info" },
}
```

## Docker

### Basic

```bash
docker build -t chat-server .
docker run -p 5030:5030 chat-server
```

### With Docker Compose

```bash
# In-memory mode
docker compose up

# With Redis
docker compose --profile with-redis up
```

## Migration from v1

The v1 API used flat event names. Here is the mapping:

| v1 Event              | v2 Event              |
|------------------------|-----------------------|
| `join`                 | Connect with `auth.userId` |
| `sendMessage`          | `dm:send`             |
| `message`              | `dm:received`         |
| `join-room`            | `room:join`           |
| `roomMessage`          | `room:message`        |
| `leave-room`           | `room:leave`          |
| `push-notification`    | `notification:broadcast` |
| `notification`         | `notification:received` |

## Project Structure

```
src/
├── index.js                     # Library entry (all exports)
├── server.js                    # Standalone entry
├── core/
│   ├── ChatServer.js            # Main orchestrator
│   ├── EventBus.js              # Internal pub/sub
│   └── constants.js             # Event names, roles, queue channels
├── channels/
│   ├── BaseChannel.js           # Shared channel logic
│   ├── DirectChat.js            # 1:1 messaging
│   ├── RoomChat.js              # Ephemeral rooms
│   ├── GroupChat.js             # Persistent groups
│   └── Notification.js          # Push notifications
├── adapters/
│   ├── cache/                   # CacheAdapter + Memory + Redis
│   ├── persistence/             # PersistenceAdapter + Memory
│   └── queue/                   # QueueAdapter + Memory + Redis
├── middleware/
│   ├── auth.js                  # JWT + custom hook
│   ├── rateLimiter.js           # Per-socket rate limit
│   └── validation.js            # Input schema validation
├── encryption/
│   └── EncryptionService.js     # AES-256-GCM
├── utils/
│   ├── uuid.js                  # UUID v7
│   ├── logger.js                # Structured logger
│   └── errors.js                # Custom error classes
└── config/
    └── defaults.js              # Default config + deep merge
```

## License

[Unlicense](LICENSE) — public domain.
