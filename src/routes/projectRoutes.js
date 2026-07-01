// src/routes/projectRoutes.js
// Demonstrates: populate with multiple refs, array manipulation in Mongoose

const express = require('express');
const router = express.Router();

const Project = require('../models/Project');
const { authenticate, authorize } = require('../middleware/auth');
const { parseQuery, paginatedResponse } = require('../utils/queryHelper');

router.use(authenticate);

// ── GET /api/projects ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { filter, sort, skip, limit, page } = parseQuery(
      req.query,
      ['status', 'department']
    );

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('department', 'name code')
        .populate('assignedEmployees', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    res.json(paginatedResponse(projects, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/projects/:id ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('department', 'name code location')
      .populate('assignedEmployees', 'firstName lastName email designation');

    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/projects ────────────────────────────────────────
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const {
      name, description, status,
      startDate, endDate, budget,
      department, assignedEmployees, tags,
    } = req.body;

    const project = new Project({
      name, description, status,
      startDate, endDate, budget,
      department, assignedEmployees, tags,
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/projects/:id ───────────────────────────────────
router.patch('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'status', 'startDate', 'endDate', 'budget', 'tags'];
    const updates = Object.keys(req.body).filter((k) => allowed.includes(k));

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    updates.forEach((key) => (project[key] = req.body[key]));
    await project.save();
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/projects/:id/assign ────────────────────────────
// Assign employees to a project (array manipulation)
router.post('/:id/assign', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { employeeIds } = req.body; // array of employee _ids

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'Provide an array of employeeIds' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Add only new assignments (avoid duplicates using Set-like filter)
    const existing = project.assignedEmployees.map((id) => id.toString());
    const toAdd = employeeIds.filter((id) => !existing.includes(id));

    project.assignedEmployees.push(...toAdd);
    await project.save();

    res.json({ message: `${toAdd.length} employee(s) assigned`, project });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/projects/:id/assign ──────────────────────────
// Remove an employee from a project
router.delete('/:id/assign/:employeeId', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.assignedEmployees = project.assignedEmployees.filter(
      (empId) => empId.toString() !== req.params.employeeId
    );

    await project.save();
    res.json({ message: 'Employee removed from project', project });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/projects/:id ──────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted', project });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
