const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Tune for high-concurrency
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // Join an event-specific room for targeted broadcasts
    socket.on('join-event', (eventId) => {
      socket.join(`event:${eventId}`);
    });

    socket.on('leave-event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      // Cleanup handled automatically by Socket.io
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit stock update to all users in a specific event room
const emitStockUpdate = (eventId, itemId, currentStock) => {
  if (!io) return;
  io.to(`event:${eventId}`).emit('stock-update', { itemId, currentStock });
};

// Emit event status change
const emitEventStatusChange = (eventId, status) => {
  if (!io) return;
  io.to(`event:${eventId}`).emit('event-status-change', { eventId, status });
};

module.exports = { initSocket, getIO, emitStockUpdate, emitEventStatusChange };