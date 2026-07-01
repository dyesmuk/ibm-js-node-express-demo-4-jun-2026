// tests/employee.test.js
// Demonstrates: Testing Node.js (Task App topic), Jest, Supertest

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/app');
const Employee = require('../src/models/Employee');
const Department = require('../src/models/Department');

// ── Test data ─────────────────────────────────────────────────
const adminData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@ems-test.com',
  password: 'admin123',
  role: 'admin',
};

const employeeData = {
  firstName: 'Raj',
  lastName: 'Sharma',
  email: 'raj.sharma@ems-test.com',
  password: 'pass123',
  role: 'employee',
};

let adminToken;
let employeeId;

// ── Setup / Teardown ──────────────────────────────────────────
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await Employee.deleteMany({ email: /@ems-test\.com$/ });
  await Department.deleteMany({ code: 'TST' });
  await mongoose.connection.close();
});

// ── Auth Tests ────────────────────────────────────────────────
describe('Auth Routes', () => {
  test('POST /api/auth/register – should create admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(adminData)
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body.employee.email).toBe(adminData.email);
    expect(res.body.employee).not.toHaveProperty('password');

    adminToken = res.body.token;
  });

  test('POST /api/auth/login – should return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminData.email, password: adminData.password })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token; // refresh token
  });

  test('POST /api/auth/login – wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminData.email, password: 'wrongpass' })
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/auth/me – returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.email).toBe(adminData.email);
  });

  test('GET /api/auth/me – no token returns 401', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });
});

// ── Department Tests ──────────────────────────────────────────
describe('Department Routes', () => {
  let deptId;

  test('POST /api/departments – admin can create', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Testing Dept', code: 'TST', location: 'Pune' })
      .expect(201);

    expect(res.body.code).toBe('TST');
    deptId = res.body._id;
  });

  test('GET /api/departments – returns paginated list', async () => {
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Employee CRUD Tests ───────────────────────────────────────
describe('Employee Routes', () => {
  test('POST /api/employees – admin creates employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(employeeData)
      .expect(201);

    expect(res.body.email).toBe(employeeData.email);
    employeeId = res.body._id;
  });

  test('GET /api/employees – paginated list', async () => {
    const res = await request(app)
      .get('/api/employees?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.pagination.limit).toBe(5);
  });

  test('GET /api/employees?search=Raj – search filter', async () => {
    const res = await request(app)
      .get('/api/employees?search=Raj')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const names = res.body.data.map((e) => e.firstName);
    expect(names).toContain('Raj');
  });

  test('GET /api/employees/:id – get by id', async () => {
    const res = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body._id).toBe(employeeId);
  });

  test('PATCH /api/employees/:id – admin updates designation', async () => {
    const res = await request(app)
      .patch(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ designation: 'Senior Dev' })
      .expect(200);

    expect(res.body.designation).toBe('Senior Dev');
  });

  test('DELETE /api/employees/:id – admin can delete', async () => {
    await request(app)
      .delete(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});

// ── Health Check ──────────────────────────────────────────────
describe('Health Check', () => {
  test('GET /health – returns OK', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('OK');
  });
});
