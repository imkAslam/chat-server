"use strict";

const { CacheAdapter } = require("./CacheAdapter");
const { AdapterError } = require("../../utils/errors");

/**
 * Redis-backed cache adapter.
 * Requires `ioredis` to be installed by the consumer (`npm i ioredis`).
 *
 * @example
 * const Redis = require("ioredis");
 * const client = new Redis("redis://localhost:6379");
 * const cache = new RedisCacheAdapter(client, { prefix: "chat:" });
 */
class RedisCacheAdapter extends CacheAdapter {
  /**
   * @param {import("ioredis").Redis} redisClient - An ioredis client instance.
   * @param {{ prefix?: string }} [opts]
   */
  constructor(redisClient, opts = {}) {
    super();
    if (!redisClient) {
      throw new AdapterError(
        "RedisCacheAdapter requires an ioredis client. Install ioredis: npm i ioredis",
      );
    }
    this._client = redisClient;
    this._prefix = opts.prefix || "chat:cache:";
  }

  /** @private */
  _key(key) {
    return `${this._prefix}${key}`;
  }

  async get(key) {
    const raw = await this._client.get(this._key(key));
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async set(key, value, ttlSeconds) {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this._client.set(this._key(key), serialized, "EX", ttlSeconds);
    } else {
      await this._client.set(this._key(key), serialized);
    }
  }

  async del(key) {
    const count = await this._client.del(this._key(key));
    return count > 0;
  }

  async has(key) {
    return (await this._client.exists(this._key(key))) === 1;
  }

  async keys(pattern) {
    const redisPattern = this._key(pattern || "*");
    const results = await this._client.keys(redisPattern);
    return results.map((k) => k.slice(this._prefix.length));
  }

  async clear() {
    const allKeys = await this._client.keys(this._key("*"));
    if (allKeys.length > 0) {
      await this._client.del(...allKeys);
    }
  }

  async close() {
    // Consumer manages the Redis client lifecycle; we just detach.
  }
}

module.exports = { RedisCacheAdapter };
