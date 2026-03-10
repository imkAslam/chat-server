"use strict";

const { QueueAdapter } = require("./QueueAdapter");
const { AdapterError } = require("../../utils/errors");

/**
 * Redis Pub/Sub queue adapter for multi-instance scaling.
 * Requires `ioredis` to be installed by the consumer.
 *
 * @example
 * const Redis = require("ioredis");
 * const pub = new Redis();
 * const sub = new Redis();
 * const queue = new RedisQueueAdapter(pub, sub, { prefix: "chat:" });
 */
class RedisQueueAdapter extends QueueAdapter {
  /**
   * @param {import("ioredis").Redis} publisher  - Client used for publishing.
   * @param {import("ioredis").Redis} subscriber - Dedicated client for subscriptions (ioredis requirement).
   * @param {{ prefix?: string }} [opts]
   */
  constructor(publisher, subscriber, opts = {}) {
    super();
    if (!publisher || !subscriber) {
      throw new AdapterError(
        "RedisQueueAdapter requires two ioredis clients (publisher + subscriber). Install ioredis: npm i ioredis",
      );
    }
    this._pub = publisher;
    this._sub = subscriber;
    this._prefix = opts.prefix || "chat:queue:";
    /** @type {Map<string, (channel: string, message: string) => void>} */
    this._handlers = new Map();
  }

  /** @private */
  _channel(ch) {
    return `${this._prefix}${ch}`;
  }

  async publish(channel, message) {
    await this._pub.publish(this._channel(channel), JSON.stringify(message));
  }

  async subscribe(channel, handler) {
    const redisCh = this._channel(channel);

    const wrapper = (_subscribedCh, raw) => {
      try {
        handler(JSON.parse(raw));
      } catch {
        handler(raw);
      }
    };

    this._handlers.set(channel, wrapper);
    this._sub.on("message", wrapper);
    await this._sub.subscribe(redisCh);
  }

  async unsubscribe(channel) {
    const redisCh = this._channel(channel);
    const wrapper = this._handlers.get(channel);
    if (wrapper) {
      this._sub.removeListener("message", wrapper);
      this._handlers.delete(channel);
    }
    await this._sub.unsubscribe(redisCh);
  }

  async close() {
    for (const channel of this._handlers.keys()) {
      await this.unsubscribe(channel);
    }
  }
}

module.exports = { RedisQueueAdapter };
