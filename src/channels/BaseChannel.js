"use strict";

const { generateId } = require("../utils/uuid");

/**
 * Base class for all communication channels.
 * Provides access to shared services (cache, persistence, queue, encryption, logger).
 */
class BaseChannel {
  /**
   * @param {object} services
   * @param {import("../adapters/cache/CacheAdapter").CacheAdapter} services.cache
   * @param {import("../adapters/persistence/PersistenceAdapter").PersistenceAdapter} services.persistence
   * @param {import("../adapters/queue/QueueAdapter").QueueAdapter} services.queue
   * @param {import("../encryption/EncryptionService").EncryptionService | null} services.encryption
   * @param {import("../core/EventBus").EventBus} services.eventBus
   * @param {import("../utils/logger").Logger} services.logger
   * @param {object} services.config
   */
  constructor(services) {
    this.cache = services.cache;
    this.persistence = services.persistence;
    this.queue = services.queue;
    this.encryption = services.encryption;
    this.eventBus = services.eventBus;
    this.logger = services.logger;
    this.config = services.config;
  }

  /**
   * Register event handlers on the Socket.IO server instance.
   * Subclasses must override this.
   * @param {import("socket.io").Server} _io
   * @param {import("socket.io").Socket} _socket
   */
  register(_io, _socket) {
    throw new Error(`${this.constructor.name}.register() not implemented`);
  }

  /**
   * Clean up when a socket disconnects.
   * Subclasses should override if they track per-socket state.
   * @param {import("socket.io").Socket} _socket
   */
  async onDisconnect(_socket) {}

  /** Generates a time-sorted UUID v7 */
  generateId() {
    return generateId();
  }

  /**
   * Optionally encrypt content string.
   * Returns the original string if encryption is disabled.
   * @param {string} content
   * @returns {string | object}
   */
  encryptContent(content) {
    if (!this.encryption) return content;
    return this.encryption.encrypt(content);
  }

  /**
   * Optionally decrypt content.
   * @param {string | object} content
   * @returns {string}
   */
  decryptContent(content) {
    if (!this.encryption) return content;
    if (typeof content === "string") return content;
    return this.encryption.decrypt(content);
  }
}

module.exports = { BaseChannel };
