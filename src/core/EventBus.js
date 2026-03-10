"use strict";

const { EventEmitter } = require("events");

/**
 * Internal event bus for cross-channel and lifecycle communication.
 * Wraps EventEmitter with a focused API.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Register a one-time listener.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  once(event, handler) {
    return super.once(event, handler);
  }
}

module.exports = { EventBus };
