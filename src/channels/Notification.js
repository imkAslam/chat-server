"use strict";

const { BaseChannel } = require("./BaseChannel");
const { EVENTS, INTERNAL_EVENTS, QUEUE_CHANNELS } = require("../core/constants");
const { withValidation } = require("../middleware/validation");

const SEND_SCHEMA = {
  to: { type: "string", required: true, maxLength: 256 },
  title: { type: "string", required: true, maxLength: 256 },
  body: { type: "string", required: false, maxLength: 4096 },
};

const BROADCAST_SCHEMA = {
  title: { type: "string", required: true, maxLength: 256 },
  body: { type: "string", required: false, maxLength: 4096 },
};

/**
 * Notification channel — targeted and broadcast push notifications.
 *
 * Events:
 *  - notification:send       { to, title, body }    -> notification:received on target user
 *  - notification:broadcast   { title, body }        -> notification:received on all users
 */
class Notification extends BaseChannel {
  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  register(io, socket) {
    const userId = this._getUserId(socket);

    socket.on(
      EVENTS.NOTIFICATION_SEND,
      withValidation(SEND_SCHEMA, async (_s, data) => {
        await this._handleSend(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.NOTIFICATION_BROADCAST,
      withValidation(BROADCAST_SCHEMA, async (_s, data) => {
        await this._handleBroadcast(io, socket, userId, data);
      }).bind(socket),
    );
  }

  /** @private */
  async _handleSend(io, socket, senderId, data) {
    const notification = {
      id: this.generateId(),
      from: senderId,
      to: data.to,
      title: data.title,
      body: data.body || "",
      timestamp: new Date().toISOString(),
    };

    await this.queue.publish(QUEUE_CHANNELS.NOTIFICATION, {
      type: "targeted",
      notification,
    });

    const recipientSocketId = await this.cache.get(`user:${data.to}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.NOTIFICATION_RECEIVED, notification);
    }

    this.eventBus.emit(INTERNAL_EVENTS.NOTIFICATION_QUEUED, notification);
    this.logger.debug(`Notification: ${senderId} -> ${data.to}: ${data.title}`);
  }

  /** @private */
  async _handleBroadcast(io, socket, senderId, data) {
    const notification = {
      id: this.generateId(),
      from: senderId,
      title: data.title,
      body: data.body || "",
      broadcast: true,
      timestamp: new Date().toISOString(),
    };

    await this.queue.publish(QUEUE_CHANNELS.NOTIFICATION, {
      type: "broadcast",
      notification,
    });

    socket.broadcast.emit(EVENTS.NOTIFICATION_RECEIVED, notification);

    this.eventBus.emit(INTERNAL_EVENTS.NOTIFICATION_QUEUED, notification);
    this.logger.debug(`Notification broadcast: ${senderId}: ${data.title}`);
  }

  /** @private */
  _getUserId(socket) {
    return socket.user?.id || socket.user?.sub || socket.handshake.auth?.userId || socket.id;
  }
}

module.exports = { Notification };
