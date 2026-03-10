"use strict";

const { AdapterError } = require("../../utils/errors");

/**
 * Base queue adapter interface.
 * Used for decoupled event processing and multi-instance scaling.
 */
class QueueAdapter {
  /**
   * Publish a message to a channel.
   * @param {string} _channel
   * @param {object} _message
   * @returns {Promise<void>}
   */
  async publish(_channel, _message) {
    throw new AdapterError("QueueAdapter.publish() not implemented");
  }

  /**
   * Subscribe to a channel.
   * @param {string} _channel
   * @param {(message: object) => void} _handler
   * @returns {Promise<void>}
   */
  async subscribe(_channel, _handler) {
    throw new AdapterError("QueueAdapter.subscribe() not implemented");
  }

  /**
   * Unsubscribe from a channel.
   * @param {string} _channel
   * @returns {Promise<void>}
   */
  async unsubscribe(_channel) {
    throw new AdapterError("QueueAdapter.unsubscribe() not implemented");
  }

  /** @returns {Promise<void>} */
  async close() {}
}

module.exports = { QueueAdapter };
