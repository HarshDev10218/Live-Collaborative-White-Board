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

// 🚀 Explicit Root Route Fallback: Forces Express to find and render index.html in cloud environments[cite: 1, 5]
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Memory store to track active user counts per room[cite: 5]
const roomUsers = {};

io.on('connection', (socket) => {
  let currentRoom = 'default';

  // 1. Listen for user room routing signals[cite: 5]
  socket.on('join-room', (roomID) => {
    currentRoom = roomID || 'default';
    socket.join(currentRoom);

    // Manage room occupant scaling increment[cite: 5]
    if (!roomUsers[currentRoom]) {
      roomUsers[currentRoom] = 0;
    }
    roomUsers[currentRoom]++;

    // Broadcast updated active numbers to everyone currently inside the specific room[cite: 5]
    io.to(currentRoom).emit('update-user-count', roomUsers[currentRoom]);
    console.log(`User joined room [${currentRoom}]. Active users: ${roomUsers[currentRoom]}`);
  });

  // 2. Broadcast live pointer strokes instantly to other peers in the same room[cite: 5]
  socket.on('drawing', (data) => {
    socket.to(currentRoom).emit('drawing', data);
  });

  // 3. Broadcast synchronous undo states to other peers in the same room[cite: 5]
  socket.on('sync-undo', (data) => {
    socket.to(currentRoom).emit('sync-undo', data);
  });

  // 4. Broadcast board clearing commands to all members of the room[cite: 5]
  socket.on('clear-board', (data) => {
    socket.to(currentRoom).emit('clear-board', data);
  });

  socket.on('add-screen', () => {
    socket.to(currentRoom).emit('add-screen');
  });

  // 5. Manage structural data cleanups upon socket disconnection drops[cite: 5]
  socket.on('disconnect', () => {
    if (roomUsers[currentRoom]) {
      roomUsers[currentRoom]--;

      // Update data meters for remaining users inside the space[cite: 5]
      io.to(currentRoom).emit('update-user-count', roomUsers[currentRoom]);

      // Purge dead room structures from memory states when completely empty[cite: 5]
      if (roomUsers[currentRoom] === 0) {
        delete roomUsers[currentRoom];
      }
    }
    console.log(`User left room [${currentRoom}].`);
  });
});

// Leverage dynamic deployment environment ports or default locally to port 3000[cite: 5]
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server successfully operating on http://localhost:${PORT}`);
});
