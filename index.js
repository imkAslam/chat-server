const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
dotenv.config();

const PORT = process.env.PORT || 5030;
app.use(cors());
app.get("/", (_req, res) => {
  // res.sendFile(__dirname + "/template/index.html");
  res.send("welcome to the server");
});

const activeUsers = {};
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  //this event will add the user in the activeUsers object against the email or name and store the key value in obj
  socket.on("join", (data) => {
    const { email } = data;
    activeUsers[email] = socket.id;
  });

  //this event will allow the user to send the private message to the user
  socket.on("sendMessage", (data) => {
    const { email, ...rest } = data;
    io.to(activeUsers[email]).emit("message", rest);
  });

  //this event will allow the user to join the room
  socket.on("join-room", (data) => {
    const { room, name } = data;

    //checking the user object either the user is in room or not if in room then add the user into the room
    if (!roomUsers[room] || !roomUsers[room].includes(socket.id)) {
      if (!roomUsers[room]) {
        roomUsers[room] = [];
      }
      roomUsers[room].push(socket.id);
    }

    // socket event to join the room
    socket.join(room);

    //this event will send the message in room to all users except the sender
    socket.to(room).emit("roomMessage", `User ${name} joined ${room}`);

    //this event will send the message in room to all users except the sender (listener)
    socket.on("roomMessage", (data) => {
      socket.to(room).emit("roomMessage", data);
    });

    // leave-room this will send notifications to all the connected users in a room except the sender
    socket.on("leave-room", () => {
      if (roomUsers[room] && roomUsers[room].includes(socket.id)) {
        socket.leave(room);

        roomUsers[room] = roomUsers[room].filter(
          (userId) => userId !== socket.id
        );

        io.to(room).emit("roomMessage", `User ${name} left ${room}`);
      }
    });
  });

  // for push notifications this will send notifications to all the connected user except the sender
  socket.on("push-notification", (data) => {
    socket.broadcast.emit("notification", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const disconnectedUser = Object.keys(activeUsers).find(
      (email) => activeUsers[email] === socket.id
    );
    if (disconnectedUser) {
      delete activeUsers[disconnectedUser];
    }
  });
});
server.listen(PORT, () => {
  console.log(`server started on:${PORT}`);
});
