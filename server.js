const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with relaxed CORS rules to enable flexible local development
const io = new Server(server, {
  cors: {
    origin: "*", // Allows smooth pairing with local servers like VS Code Live Server
    methods: ["GET", "POST"]
  }
});

// Serve static frontend resources (HTML, CSS, JS) from your root project folder
app.use(express.static(path.join(__dirname)));

// Memory store to track active user counts per room
const roomUsers = {};

io.on('connection', (socket) => {
  let currentRoom = 'default';

  // 1. Listen for user room routing signals
  socket.on('join-room', (roomID) => {
    currentRoom = roomID || 'default';
    socket.join(currentRoom);

    // Manage room occupant scaling increment
    if (!roomUsers[currentRoom]) {
      roomUsers[currentRoom] = 0;
    }
    roomUsers[currentRoom]++;

    // Broadcast updated active numbers to everyone currently inside the specific room
    io.to(currentRoom).emit('update-user-count', roomUsers[currentRoom]);
    console.log(`User joined room [${currentRoom}]. Active users: ${roomUsers[currentRoom]}`);
  });

  // 2. Broadcast live pointer strokes instantly to other peers in the same room
  socket.on('drawing', (data) => {
    socket.to(currentRoom).emit('drawing', data);
  });

  // 3. Broadcast synchronous undo states to other peers in the same room
  socket.on('sync-undo', (canvasSnapshot) => {
    socket.to(currentRoom).emit('sync-undo', canvasSnapshot);
  });

  // 4. Broadcast board clearing commands to all members of the room
  socket.on('clear-board', () => {
    io.to(currentRoom).emit('clear-board');
  });

  // 5. Manage structural data cleanups upon socket disconnection drops
  socket.on('disconnect', () => {
    if (roomUsers[currentRoom]) {
      roomUsers[currentRoom]--;
      
      // Update data meters for remaining users inside the space
      io.to(currentRoom).emit('update-user-count', roomUsers[currentRoom]);
      
      // Purge dead room structures from memory states when completely empty
      if (roomUsers[currentRoom] === 0) {
        delete roomUsers[currentRoom];
      }
    }
    console.log(`User left room [${currentRoom}].`);
  });
});

// Leverage dynamic deployment environment ports or default locally to port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server successfully operating on http://localhost:${PORT}`);
});