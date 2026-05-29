const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = {};

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('host_game', ({ username }) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      started: false,
      players: { [socket.id]: { id: socket.id, username, health: 100, kills: 0, x: 0, z: 2.5, yaw: 0 } }
    };
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;
    socket.emit('room_created', { roomCode, playerId: socket.id });
    console.log('Room created:', roomCode, 'by', username);
  });

  socket.on('join_game', ({ roomCode, username }) => {
    const room = rooms[roomCode];
    if (!room) { socket.emit('join_error', { message: 'Room not found. Check your code.' }); return; }
    if (room.started) { socket.emit('join_error', { message: 'Game already in progress.' }); return; }
    if (Object.keys(room.players).length >= 4) { socket.emit('join_error', { message: 'Room is full (max 4 players).' }); return; }
    room.players[socket.id] = { id: socket.id, username, health: 100, kills: 0, x: 2, z: 2.5, yaw: 0 };
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;
    socket.emit('room_joined', { roomCode, playerId: socket.id, players: room.players });
    socket.to(roomCode).emit('player_joined', { player: room.players[socket.id] });
    console.log(username, 'joined room', roomCode);
  });

  socket.on('start_game', () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    room.started = true;
    io.to(roomCode).emit('game_started', { players: room.players });
  });

  socket.on('player_update', (data) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;
    room.players[socket.id] = { ...room.players[socket.id], ...data };
    socket.to(roomCode).emit('player_moved', { id: socket.id, ...data });
  });

  socket.on('zombie_hit', (data) => {
    const roomCode = socket.data.roomCode;
    socket.to(roomCode).emit('zombie_hit_sync', { shooterId: socket.id, ...data });
  });

  socket.on('player_damaged', ({ damage }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;
    room.players[socket.id].health = Math.max(0, room.players[socket.id].health - damage);
    io.to(roomCode).emit('player_health_update', { id: socket.id, health: room.players[socket.id].health });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];
    delete room.players[socket.id];
    socket.to(roomCode).emit('player_left', { id: socket.id });
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomCode];
    } else if (room.hostId === socket.id) {
      const newHostId = Object.keys(room.players)[0];
      room.hostId = newHostId;
      io.to(roomCode).emit('host_changed', { newHostId });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log('Dead Bell server running on port', PORT));
