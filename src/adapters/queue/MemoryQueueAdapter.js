"use strict";

const { EventEmitter } = require("events");
const { QueueAdapter } = require("./QueueAdapter");

/**
 * In-process queue adapter backed by Node.js EventEmitter.
 * Suitable for single-instance deployments.
 */
class MemoryQueueAdapter extends QueueAdapter {
  constructor() {
    super();
    this._emitter = new EventEmitter();
    this._emitter.setMaxListeners(100);
  }

  async publish(channel, message) {
    this._emitter.emit(channel, message);
  }

  async subscribe(channel, handler) {
    this._emitter.on(channel, handler);
  }

  async unsubscribe(channel) {
    this._emitter.removeAllListeners(channel);
  }

  async close() {
    this._emitter.removeAllListeners();
  }
}

module.exports = { MemoryQueueAdapter };
