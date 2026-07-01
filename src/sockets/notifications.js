// src/sockets/notifications.js
// Demonstrates: Real-Time Web Applications with Socket.io (Chat App topic)

const setupSocketIO = (io) => {
  // Track connected users: socketId → employeeId
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Employee identifies themselves after connecting
    socket.on('identify', ({ employeeId, name }) => {
      connectedUsers.set(socket.id, { employeeId, name });
      socket.join(`employee:${employeeId}`); // personal room

      // Notify others
      socket.broadcast.emit('user:online', { employeeId, name });

      // Send current online list back to the new joiner
      const onlineList = [...connectedUsers.values()];
      socket.emit('users:online', onlineList);

      console.log(`👤 Employee identified: ${name} (${employeeId})`);
    });

    // ── Notification: broadcast to all ───────────────────────
    socket.on('notify:all', ({ message, type = 'info' }) => {
      io.emit('notification', { message, type, timestamp: new Date() });
    });

    // ── Notification: send to specific employee ───────────────
    socket.on('notify:employee', ({ employeeId, message, type = 'info' }) => {
      io.to(`employee:${employeeId}`).emit('notification', {
        message,
        type,
        timestamp: new Date(),
      });
    });

    // ── Project update broadcast ──────────────────────────────
    socket.on('project:update', ({ projectId, projectName, status }) => {
      io.emit('project:updated', {
        projectId,
        projectName,
        status,
        updatedBy: connectedUsers.get(socket.id),
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.broadcast.emit('user:offline', user);
        connectedUsers.delete(socket.id);
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocketIO;
