// src/routes/departmentRoutes.js
// Demonstrates: REST CRUD, Mongoose populate, aggregation basics

const express = require('express');
const router = express.Router();

const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { authenticate, authorize } = require('../middleware/auth');
const { parseQuery, paginatedResponse } = require('../utils/queryHelper');

router.use(authenticate);

// ── GET /api/departments ──────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { filter, sort, skip, limit, page } = parseQuery(req.query, []);

    const [departments, total] = await Promise.all([
      Department.find(filter).sort(sort).skip(skip).limit(limit),
      Department.countDocuments(filter),
    ]);

    res.json(paginatedResponse(departments, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/departments/:id ──────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    // Count employees in this department (Mongoose countDocuments)
    const employeeCount = await Employee.countDocuments({ department: dept._id });

    res.json({ ...dept.toObject(), employeeCount });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/departments/:id/employees ────────────────────────
// List all employees in a department
router.get('/:id/employees', async (req, res, next) => {
  try {
    const { sort, skip, limit, page } = parseQuery(req.query, []);

    const [employees, total] = await Promise.all([
      Employee.find({ department: req.params.id })
        .select('firstName lastName email designation salary isActive')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Employee.countDocuments({ department: req.params.id }),
    ]);

    res.json(paginatedResponse(employees, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/departments ─────────────────────────────────────
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, code, description, location, budget } = req.body;
    const dept = new Department({ name, code, description, location, budget });
    await dept.save();
    res.status(201).json(dept);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/departments/:id ────────────────────────────────
router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'location', 'budget'];
    const updates = Object.keys(req.body).filter((k) => allowed.includes(k));

    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    updates.forEach((key) => (dept[key] = req.body[key]));
    await dept.save();

    res.json(dept);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/departments/:id ───────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    // Business rule: can't delete dept with active employees
    const hasEmployees = await Employee.exists({ department: req.params.id });
    if (hasEmployees) {
      return res.status(409).json({
        error: 'Cannot delete department with existing employees. Reassign them first.',
      });
    }

    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    res.json({ message: 'Department deleted', dept });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
