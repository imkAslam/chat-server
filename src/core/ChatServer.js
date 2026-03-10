"use strict";

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server: SocketIOServer } = require("socket.io");

const { buildConfig } = require("../config/defaults");
const { EventBus } = require("./EventBus");
const { EVENTS, INTERNAL_EVENTS } = require("./constants");
const { Logger } = require("../utils/logger");

// Adapters — defaults
const { MemoryCacheAdapter } = require("../adapters/cache/MemoryCacheAdapter");
const { MemoryPersistenceAdapter } = require("../adapters/persistence/MemoryPersistenceAdapter");
const { MemoryQueueAdapter } = require("../adapters/queue/MemoryQueueAdapter");

// Middleware
const { createAuthMiddleware } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimiter");

// Encryption
const { EncryptionService } = require("../encryption/EncryptionService");

// Channels
const { DirectChat } = require("../channels/DirectChat");
const { RoomChat } = require("../channels/RoomChat");
const { GroupChat } = require("../channels/GroupChat");
const { Notification } = require("../channels/Notification");

/**
 * Main chat server orchestrator.
 *
 * Can be used in two modes:
 * 1. **Library** — pass an existing `http.Server` via `config.server`.
 * 2. **Standalone** — omit `config.server` and an Express app is created automatically.
 */
class ChatServer {
  /**
   * @param {object} [userConfig]
   * @param {http.Server} [userConfig.server] - Existing HTTP server to attach to.
   * @param {import("../adapters/cache/CacheAdapter").CacheAdapter} [userConfig.cache]
   * @param {import("../adapters/persistence/PersistenceAdapter").PersistenceAdapter} [userConfig.persistence]
   * @param {import("../adapters/queue/QueueAdapter").QueueAdapter} [userConfig.queue]
   */
  constructor(userConfig = {}) {
    const { server: existingServer, cache, persistence, queue, ...rest } = userConfig;

    this.config = buildConfig(rest);
    this.logger = new Logger({ level: this.config.logging.level, prefix: "chat-server" });
    this.eventBus = new EventBus();

    // Adapters — use provided or fall back to in-memory defaults
    this.cache = cache || new MemoryCacheAdapter();
    this.persistence = persistence || new MemoryPersistenceAdapter();
    this.queue = queue || new MemoryQueueAdapter();

    // Encryption (optional)
    this.encryption = this.config.encryption.enabled
      ? new EncryptionService(this.config.encryption)
      : null;

    // HTTP server
    if (existingServer) {
      this._httpServer = existingServer;
      this._ownsServer = false;
    } else {
      this._app = express();
      this._setupExpress(this._app);
      this._httpServer = http.createServer(this._app);
      this._ownsServer = true;
    }

    // Socket.IO
    this.io = new SocketIOServer(this._httpServer, {
      cors: this.config.cors,
      ...this.config.socketIO,
    });

    // Channels
    this._channels = this._createChannels();

    // Wire up
    this._setupMiddleware();
    this._setupConnectionHandler();
    this._setupGracefulShutdown();
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Start listening (only relevant when running standalone).
   * @param {number} [port]
   * @returns {Promise<void>}
   */
  start(port) {
    const listenPort = port || this.config.port;
    return new Promise((resolve) => {
      if (this._ownsServer) {
        this._httpServer.listen(listenPort, () => {
          this.logger.info(`Chat server listening on port ${listenPort}`);
          resolve();
        });
      } else {
        this.logger.info("Chat server attached to existing HTTP server");
        resolve();
      }
    });
  }

  /**
   * Gracefully stop the server.
   * @returns {Promise<void>}
   */
  async stop() {
    this.logger.info("Shutting down...");

    // Disconnect all sockets
    const sockets = await this.io.fetchSockets();
    for (const s of sockets) s.disconnect(true);

    this.io.close();

    await this.cache.close();
    await this.persistence.close();
    await this.queue.close();

    if (this._ownsServer) {
      await new Promise((resolve) => this._httpServer.close(resolve));
    }

    this.logger.info("Shutdown complete");
  }

  /**
   * Access the underlying Express app (standalone mode only).
   * Useful for adding custom REST routes.
   * @returns {express.Application | undefined}
   */
  getApp() {
    return this._app;
  }

  /**
   * Access the HTTP server.
   * @returns {http.Server}
   */
  getHttpServer() {
    return this._httpServer;
  }

  // ── Internal ──────────────────────────────────────────────────────

  /** @private */
  _setupExpress(app) {
    app.use(helmet());
    app.use(cors(this.config.cors));
    app.use(express.json({ limit: "1mb" }));

    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        connections: this.io?.engine?.clientsCount ?? 0,
      });
    });

    app.get("/", (_req, res) => {
      res.json({ name: "chat-server", version: "2.0.0" });
    });
  }

  /** @private */
  _createChannels() {
    const services = {
      cache: this.cache,
      persistence: this.persistence,
      queue: this.queue,
      encryption: this.encryption,
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    };

    return [
      new DirectChat(services),
      new RoomChat(services),
      new GroupChat(services),
      new Notification(services),
    ];
  }

  /** @private */
  _setupMiddleware() {
    this.io.use(createAuthMiddleware(this.config.auth, this.logger));
    this.io.use(createRateLimiter(this.config.rateLimit, this.logger));
  }

  /** @private */
  _setupConnectionHandler() {
    this.io.on(EVENTS.CONNECTION, async (socket) => {
      const userId = this._getUserId(socket);
      this.logger.info(`Connected: ${userId} (socket ${socket.id})`);

      // Map userId -> socketId in cache
      await this.cache.set(`user:${userId}`, socket.id);

      // Register all channel handlers on this socket
      for (const channel of this._channels) {
        channel.register(this.io, socket);
      }

      this.eventBus.emit(INTERNAL_EVENTS.USER_CONNECTED, { userId, socketId: socket.id });

      // Disconnect handling
      socket.on(EVENTS.DISCONNECT, async () => {
        this.logger.info(`Disconnected: ${userId} (socket ${socket.id})`);
        await this.cache.del(`user:${userId}`);

        for (const channel of this._channels) {
          await channel.onDisconnect(socket);
        }

        this.eventBus.emit(INTERNAL_EVENTS.USER_DISCONNECTED, { userId, socketId: socket.id });
      });
    });
  }

  /** @private */
  _setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);

      const timeout = setTimeout(() => {
        this.logger.error("Shutdown timeout exceeded, forcing exit");
        process.exit(1);
      }, this.config.gracefulShutdownTimeoutMs);

      try {
        await this.stop();
        clearTimeout(timeout);
        process.exit(0);
      } catch (err) {
        this.logger.error("Error during shutdown:", err.message);
        clearTimeout(timeout);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /** @private */
  _getUserId(socket) {
    return socket.user?.id || socket.user?.sub || socket.handshake.auth?.userId || socket.id;
  }
}

module.exports = { ChatServer };
