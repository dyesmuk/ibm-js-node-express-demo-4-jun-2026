// src/routes/employeeRoutes.js
// Demonstrates: REST APIs & Mongoose, Sorting/Pagination/Filtering,
//               File Uploads, Authentication & Security

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const Employee = require('../models/Employee');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseQuery, paginatedResponse } = require('../utils/queryHelper');

// All routes require authentication
router.use(authenticate);

// ── GET /api/employees ────────────────────────────────────────
// Sorting, Pagination, Filtering demo
router.get('/', async (req, res, next) => {
  try {
    const { filter, sort, skip, limit, page, projection } = parseQuery(
      req.query,
      ['isActive', 'department', 'role', 'designation']
    );

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .select(projection)
        .populate('department', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(filter),
    ]);

    res.json(paginatedResponse(employees, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/employees/:id ────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      'department',
      'name code location'
    );
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/employees ───────────────────────────────────────
// Admin/Manager only
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // Whitelist allowed fields (security best practice)
    const allowed = [
      'firstName', 'lastName', 'email', 'password',
      'phone', 'designation', 'salary', 'department',
      'joinDate', 'role',
    ];

    // JS: reduce over an array to build an object
    const body = allowed.reduce((acc, key) => {
      if (req.body[key] !== undefined) acc[key] = req.body[key];
      return acc;
    }, {});

    const employee = new Employee(body);
    await employee.save();

    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/employees/:id ──────────────────────────────────
// Employee can update themselves; admin can update anyone
router.patch('/:id', async (req, res, next) => {
  try {
    // Only admin can update role/salary
    const allowedForAll = ['firstName', 'lastName', 'phone', 'designation'];
    const allowedForAdmin = [...allowedForAll, 'salary', 'role', 'department', 'isActive'];

    const allowed = req.employee.role === 'admin' ? allowedForAdmin : allowedForAll;
    const updates = Object.keys(req.body);
    const invalid = updates.filter((k) => !allowed.includes(k));

    if (invalid.length > 0) {
      return res.status(400).json({ error: `Not allowed to update: ${invalid.join(', ')}` });
    }

    // Employees can only edit themselves unless admin
    const targetId = req.params.id;
    if (req.employee.role !== 'admin' && req.employee._id.toString() !== targetId) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const employee = await Employee.findById(targetId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Apply updates (JS: forEach on an array)
    updates.forEach((key) => {
      if (allowed.includes(key)) employee[key] = req.body[key];
    });

    await employee.save();
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/employees/:id ─────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted', employee });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/employees/:id/avatar ───────────────────────────
// File Upload demo
router.post('/:id/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Delete old avatar if exists
    if (employee.avatar) {
      const oldPath = path.join(process.env.UPLOAD_DIR || 'uploads', employee.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    employee.avatar = req.file.filename;
    await employee.save();

    res.json({ message: 'Avatar uploaded', avatar: req.file.filename });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
