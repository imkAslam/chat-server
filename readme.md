# Node.js Chat Application Server

This repository contains the backend code for a Node.js chat application. This server is responsible for managing real-time communication between users, including private messages, group chats (rooms), and push notifications.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Server Features](#server-features)
  - [Socket.io](#socketio)
  - [Active Users](#active-users)
  - [Private Messaging](#private-messaging)
  - [Room Management](#room-management)
  - [Push Notifications](#push-notifications)
- [Usage](#usage)
- [License](#license)
- [About the Developer](#about-the-developer)
- [My Git Repository](#my-git-repository)

## Prerequisites

Before you can use this server, ensure you have the following software and dependencies installed:

- Node.js: [Download Node.js](https://nodejs.org/)
- npm (Node Package Manager): Included with Node.js installation
- [Socket.io](https://socket.io/): A real-time engine for managing WebSockets

## Getting Started

1. Clone this repository to your local machine.
2. Install the required Node.js packages by running `npm install`.
3. Create a `.env` file in the root directory and define your environment variables if needed (e.g., PORT).
4. Start the server by running `npm start` or `node your-server-file.js`.
5. Open a postman and visit `http://localhost:your_defined_port`.
6. You're all set! Now go build something awesome! 😎🚀

## Server Features

### Socket.io

Socket.io is used to facilitate real-time communication between the server and connected clients. It allows for events to be emitted and received, enabling instant messaging and notifications.

### Active Users

The server keeps track of active users by storing their socket IDs in memory. When a user connects, their email is associated with their socket ID. This allows for private messages to be sent directly to specific users.

### Private Messaging

Users can send private messages to one another using their socket IDs. When a message is sent, the server locates the recipient's socket ID and sends the message directly to them.

### Room Management

The server supports the creation of chat rooms. Users can join a room, and the server keeps track of the users in each room. Room messages are broadcast to all members of the room except the sender. Users can also leave rooms, which triggers a notification to the remaining members.

### Push Notifications

The server supports push notifications. Users can send push notifications to all connected clients except the sender. These notifications can be used for broadcasting important messages or announcements.


## Usage

1. Connect to the server by specifying the server's URL, typically `http://localhost:5030` in your client application.
2. Emit events to interact with the server:
   - `"join"`: To associate a user's email with their socket ID.
   - `"sendMessage"`: To send a private message to a user by their email.
   - `"join-room"`: To join a chat room.
   - `"roomMessage"`: To send a message to a chat room.
   - `"leave-room"`: To leave a chat room.
   - `"push-notification"`: To send a push notification to all connected clients.
3. Listen for events:
   - `"message"`: Receive private messages.
   - `"roomMessage"`: Receive messages from chat rooms.
   - `"notification"`: Receive push notifications.

Make sure to adapt this server to your specific application's needs and add any necessary security features if deploying it in a production environment.

## License
open-source code you can use it and also participate to improve it further.

## About the Developer

I'm [Kamran], the developer behind this Node.js Chat Application Server. With a passion for real-time communication and web development, I created this server to provide a robust and flexible solution for chat applications.

If you have any questions, suggestions, or need assistance with this project, please feel free to contact me at [kamranaslam184@gmail.com].

## My Git Repository

You can find the code for this project in my Git repository: [Link](https://github.com/imkAslam/chat-server).
