"use strict";

const { AdapterError } = require("../../utils/errors");

/**
 * Base cache adapter interface.
 * All custom cache adapters must extend this class and implement every method.
 */
class CacheAdapter {
  /** @param {string} _key @returns {Promise<any>} */
  async get(_key) {
    throw new AdapterError("CacheAdapter.get() not implemented");
  }

  /** @param {string} _key @param {any} _value @param {number} [_ttlSeconds] @returns {Promise<void>} */
  async set(_key, _value, _ttlSeconds) {
    throw new AdapterError("CacheAdapter.set() not implemented");
  }

  /** @param {string} _key @returns {Promise<boolean>} */
  async del(_key) {
    throw new AdapterError("CacheAdapter.del() not implemented");
  }

  /** @param {string} _key @returns {Promise<boolean>} */
  async has(_key) {
    throw new AdapterError("CacheAdapter.has() not implemented");
  }

  /** @param {string} [_pattern] @returns {Promise<string[]>} */
  async keys(_pattern) {
    throw new AdapterError("CacheAdapter.keys() not implemented");
  }

  /** @returns {Promise<void>} */
  async clear() {
    throw new AdapterError("CacheAdapter.clear() not implemented");
  }

  /** @returns {Promise<void>} */
  async close() {}
}

module.exports = { CacheAdapter };
