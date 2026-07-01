// src/middleware/auth.js
// Demonstrates: API Authentication & Security (Task App topic),
//               middleware pattern in Express, JWT verification

const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// ── Verify JWT ────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token is still in employee's token list (supports logout)
    const employee = await Employee.findOne({
      _id: decoded._id,
      'tokens.token': token,
    });

    if (!employee) {
      return res.status(401).json({ error: 'Token invalid or expired.' });
    }

    req.token = token;
    req.employee = employee;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

// ── Role-based access guard ───────────────────────────────────
// Usage: authorize('admin') or authorize('manager', 'admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.employee.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
