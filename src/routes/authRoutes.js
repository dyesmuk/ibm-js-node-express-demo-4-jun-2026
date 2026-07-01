// src/routes/authRoutes.js
// Demonstrates: Express Router, REST API design, JWT auth flow

const express = require('express');
const router = express.Router();

const Employee = require('../models/Employee');
const { authenticate } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

// ── POST /api/auth/register ───────────────────────────────────
// Public: create first account (or admin creates employees)
router.post('/register', async (req, res, next) => {
  try {
    // Destructure only what we need (JS Objects demo)
    const { firstName, lastName, email, password, role } = req.body;

    const employee = new Employee({ firstName, lastName, email, password, role });
    await employee.save();

    const token = await employee.generateAuthToken();

    // Fire-and-forget email (Promises demo)
    sendWelcomeEmail({ to: email, firstName }).catch(console.error);

    res.status(201).json({ employee, token });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const employee = await Employee.findByCredentials(email, password);
    const token = await employee.generateAuthToken();

    res.json({ employee, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
// Invalidate current token (remove from tokens array)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    req.employee.tokens = req.employee.tokens.filter(
      (t) => t.token !== req.token
    );
    await req.employee.save();
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout-all ─────────────────────────────────
// Invalidate ALL tokens (useful when password compromised)
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    req.employee.tokens = [];
    await req.employee.save();
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json(req.employee);
});

module.exports = router;
