"use strict";

const { CacheAdapter } = require("./CacheAdapter");

/**
 * In-memory cache backed by a Map with optional per-key TTL.
 * Default adapter — zero external dependencies.
 */
class MemoryCacheAdapter extends CacheAdapter {
  constructor() {
    super();
    /** @type {Map<string, { value: any, expiry: number | null }>} */
    this._store = new Map();
    /** @type {Map<string, NodeJS.Timeout>} */
    this._timers = new Map();
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this._remove(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    this._clearTimer(key);
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this._store.set(key, { value, expiry });
    if (ttlSeconds) {
      this._timers.set(
        key,
        setTimeout(() => this._remove(key), ttlSeconds * 1000),
      );
    }
  }

  async del(key) {
    return this._remove(key);
  }

  async has(key) {
    const val = await this.get(key);
    return val !== undefined;
  }

  async keys(pattern) {
    const allKeys = [...this._store.keys()];
    if (!pattern || pattern === "*") return allKeys;
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return allKeys.filter((k) => regex.test(k));
  }

  async clear() {
    for (const timer of this._timers.values()) clearTimeout(timer);
    this._timers.clear();
    this._store.clear();
  }

  async close() {
    await this.clear();
  }

  /** @private */
  _remove(key) {
    this._clearTimer(key);
    return this._store.delete(key);
  }

  /** @private */
  _clearTimer(key) {
    const timer = this._timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(key);
    }
  }
}

module.exports = { MemoryCacheAdapter };
