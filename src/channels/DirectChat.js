"use strict";

const { BaseChannel } = require("./BaseChannel");
const { EVENTS, INTERNAL_EVENTS, QUEUE_CHANNELS } = require("../core/constants");
const { withValidation } = require("../middleware/validation");

const SEND_SCHEMA = {
  to: { type: "string", required: true, maxLength: 256 },
  content: { type: "string", required: true, maxLength: 8192 },
};

const TYPING_SCHEMA = {
  to: { type: "string", required: true, maxLength: 256 },
};

const READ_SCHEMA = {
  to: { type: "string", required: true, maxLength: 256 },
  messageId: { type: "string", required: true, maxLength: 64 },
};

/**
 * Direct (1:1) messaging channel.
 *
 * Events:
 *  - dm:send     { to, content }              -> dm:received on recipient
 *  - dm:typing   { to }                       -> dm:typing on recipient
 *  - dm:read     { to, messageId }            -> dm:read on recipient
 */
class DirectChat extends BaseChannel {
  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  register(io, socket) {
    const userId = this._getUserId(socket);

    socket.on(
      EVENTS.DM_SEND,
      withValidation(SEND_SCHEMA, async (_sock, data) => {
        await this._handleSend(io, socket, userId, data);
      }, this.config.maxMessageSize).bind(socket),
    );

    socket.on(
      EVENTS.DM_TYPING,
      withValidation(TYPING_SCHEMA, async (_sock, data) => {
        await this._handleTyping(io, socket, userId, data);
      }).bind(socket),
    );

    socket.on(
      EVENTS.DM_READ,
      withValidation(READ_SCHEMA, async (_sock, data) => {
        await this._handleRead(io, socket, userId, data);
      }).bind(socket),
    );
  }

  /** @private */
  async _handleSend(io, socket, senderId, data) {
    const { to, content } = data;

    const message = {
      id: this.generateId(),
      channelId: [senderId, to].sort().join(":"),
      channelType: "dm",
      senderId,
      content: this.encryptContent(content),
      timestamp: new Date().toISOString(),
    };

    await this.queue.publish(QUEUE_CHANNELS.DM, {
      type: "send",
      message,
      recipientId: to,
    });

    await this.persistence.saveMessage(message);

    const recipientSocketId = await this.cache.get(`user:${to}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.DM_RECEIVED, {
        id: message.id,
        from: senderId,
        content: data.content,
        timestamp: message.timestamp,
      });
    }

    socket.emit(EVENTS.DM_RECEIVED, {
      id: message.id,
      from: senderId,
      to,
      content: data.content,
      timestamp: message.timestamp,
      self: true,
    });

    this.eventBus.emit(INTERNAL_EVENTS.MESSAGE_SENT, message);
    this.logger.debug(`DM: ${senderId} -> ${to}`);
  }

  /** @private */
  async _handleTyping(io, _socket, senderId, data) {
    const recipientSocketId = await this.cache.get(`user:${data.to}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.DM_TYPING, { from: senderId });
    }
  }

  /** @private */
  async _handleRead(io, _socket, senderId, data) {
    const recipientSocketId = await this.cache.get(`user:${data.to}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(EVENTS.DM_READ, {
        from: senderId,
        messageId: data.messageId,
      });
    }
  }

  /** @private */
  _getUserId(socket) {
    return socket.user?.id || socket.user?.sub || socket.handshake.auth?.userId || socket.id;
  }
}

module.exports = { DirectChat };
