// src/app.js
// Demonstrates: Express setup, middleware chain, routing, Web Servers topic,
//               environment config, Node.js module system

require('dotenv').config();
const cors = require('cors');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const setupSocketIO = require('./sockets/notifications');

// ── Route modules ─────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const projectRoutes = require('./routes/projectRoutes');

// ── App & HTTP server ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' },
});
setupSocketIO(io);

// ── Connect to MongoDB ────────────────────────────────────────
connectDB();

// ── Global Middleware ─────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());                        // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse form data

// Serve uploaded files statically (File Uploads demo)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/projects', projectRoutes);

// ── Health check (Accessing API from Browser topic) ───────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler (must be last) ──────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// Export app for testing (Testing Node.js topic)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`
🚀 EMS API running at http://localhost:${PORT}
📋 Health check: http://localhost:${PORT}/health
🌍 Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

module.exports = { app, server };
