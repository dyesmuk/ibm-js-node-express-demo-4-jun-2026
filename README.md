# IBM EMS API — Employee Management System

> IBM Full Stack Developer Training — Node.js + Express + MongoDB Proof-of-Concept

A clean, well-commented RESTful API covering **all** the training topics listed in the curriculum.  
Domain: **Employee Management System** (Employees, Departments, Projects).

---

## 📁 Project Structure

```
ibm-ems-api/
├── src/
│   ├── app.js                  ← Express app entry point
│   ├── config/
│   │   └── db.js               ← MongoDB connection (async/await)
│   ├── models/
│   │   ├── Employee.js         ← Full model: auth, virtuals, hooks
│   │   ├── Department.js       ← Relationships, validators
│   │   └── Project.js          ← Arrays of refs, enums
│   ├── routes/
│   │   ├── authRoutes.js       ← Register / Login / Logout / Me
│   │   ├── employeeRoutes.js   ← CRUD + Avatar Upload + Pagination
│   │   ├── departmentRoutes.js ← CRUD + nested employee listing
│   │   └── projectRoutes.js    ← CRUD + assign/unassign employees
│   ├── middleware/
│   │   ├── auth.js             ← JWT verify + role-based guard
│   │   ├── upload.js           ← Multer file upload
│   │   └── errorHandler.js     ← Centralised error responses
│   ├── utils/
│   │   ├── queryHelper.js      ← Sorting, Pagination, Filtering
│   │   └── email.js            ← Nodemailer welcome email
│   └── sockets/
│       └── notifications.js    ← Socket.io real-time notifications
├── tests/
│   └── employee.test.js        ← Jest + Supertest test suite
├── scripts/
│   └── seed.js                 ← Sample data seeder
├── uploads/                    ← Avatar files (git-ignored)
├── .env.example
└── package.json
```

---

## 🗺️ Topic Coverage Map

| Training Topic | Where it's demonstrated |
|---|---|
| **JS Basics, Operators, Control Flow** | `queryHelper.js`, all route files |
| **JS Objects & Arrays** | `seed.js`, `queryHelper.js`, `projectRoutes.js` (array assign/unassign) |
| **JS Functions** | Model methods, middleware, util helpers |
| **Node.js Module System** | Every `require` / `module.exports` throughout |
| **File System (fs)** | `upload.js` (mkdir, existsSync, unlinkSync) |
| **Command Line Args** | `seed.js` (run as `node scripts/seed.js`) |
| **Debugging** | Structured `console.error` + error middleware |
| **Async Node.js / Promises** | `db.js`, all async route handlers, `email.js` |
| **Web Servers** | `app.js` — `http.createServer` + Express |
| **Accessing API from Browser** | `/health` endpoint, static `/uploads` serving |
| **Application Deployment** | `.env.example`, `NODE_ENV` handling, `process.exit` |
| **MongoDB & Promises** | All Mongoose CRUD operations |
| **REST APIs & Mongoose** | All route files + model schemas |
| **API Authentication & Security** | `auth.js` middleware, JWT, bcrypt, token list |
| **Sorting, Pagination, Filtering** | `queryHelper.js` + `GET /api/employees?page=&limit=&sortBy=&search=` |
| **File Uploads** | `upload.js` (Multer) + `POST /api/employees/:id/avatar` |
| **Sending Emails** | `email.js` (Nodemailer) — triggered on register |
| **Testing Node.js** | `tests/employee.test.js` (Jest + Supertest) |
| **Real-Time (Socket.io)** | `sockets/notifications.js` |
| **Express Router** | Separate router files per resource |
| **Express Middleware** | `errorHandler.js`, `auth.js`, `upload.js` |
| **Express Req & Res** | Query params, body, params used throughout |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET etc.
```

### 3. Seed sample data
```bash
node scripts/seed.js
```

### 4. Start the server
```bash
npm start          # production
npm run dev        # dev with nodemon (hot-reload)
```

### 5. Run tests
```bash
npm test
```

---

## 🔐 Authentication

All API endpoints (except `/health`) require a **Bearer token**.

```
Authorization: Bearer <token>
```

Get a token via:
- `POST /api/auth/register`
- `POST /api/auth/login`

### Roles
| Role | Permissions |
|------|-------------|
| `admin` | Full CRUD on everything |
| `manager` | Create employees/projects, assign |
| `employee` | Read all, update own profile |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login → JWT |
| POST | `/api/auth/logout` | Auth | Invalidate current token |
| POST | `/api/auth/logout-all` | Auth | Invalidate all tokens |
| GET | `/api/auth/me` | Auth | Get current user |

### Employees
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/employees` | Auth | List (paginated, filtered, sorted) |
| GET | `/api/employees/:id` | Auth | Get by ID |
| POST | `/api/employees` | Admin/Manager | Create employee |
| PATCH | `/api/employees/:id` | Auth | Update (own or admin) |
| DELETE | `/api/employees/:id` | Admin | Delete |
| POST | `/api/employees/:id/avatar` | Auth | Upload avatar image |

### Departments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/departments` | Auth | List |
| GET | `/api/departments/:id` | Auth | Get with employee count |
| GET | `/api/departments/:id/employees` | Auth | Employees in dept |
| POST | `/api/departments` | Admin | Create |
| PATCH | `/api/departments/:id` | Admin | Update |
| DELETE | `/api/departments/:id` | Admin | Delete (if no employees) |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Auth | List |
| GET | `/api/projects/:id` | Auth | Get with populated refs |
| POST | `/api/projects` | Admin/Manager | Create |
| PATCH | `/api/projects/:id` | Admin/Manager | Update |
| POST | `/api/projects/:id/assign` | Admin/Manager | Assign employees (array) |
| DELETE | `/api/projects/:id/assign/:empId` | Admin/Manager | Unassign employee |
| DELETE | `/api/projects/:id` | Admin | Delete |

---

## 🔍 Query Parameters (Employees)

```
GET /api/employees?page=2&limit=5&sortBy=salary:desc&isActive=true&search=Ravi
```

| Param | Description | Example |
|-------|-------------|---------|
| `page` | Page number (default 1) | `page=2` |
| `limit` | Items per page (max 100) | `limit=10` |
| `sortBy` | `field:asc` or `field:desc` | `sortBy=salary:desc` |
| `search` | Text search on name/email | `search=Ravi` |
| `isActive` | Filter active/inactive | `isActive=true` |
| `department` | Filter by dept ObjectId | `department=<id>` |
| `fields` | Project specific fields | `fields=firstName,email` |

---

## 🔌 Socket.io Events

Connect to `ws://localhost:3000` and emit:

| Event | Payload | Description |
|-------|---------|-------------|
| `identify` | `{ employeeId, name }` | Register socket user |
| `notify:all` | `{ message, type }` | Broadcast notification |
| `notify:employee` | `{ employeeId, message }` | Private notification |
| `project:update` | `{ projectId, projectName, status }` | Broadcast project change |

Listen for:
- `notification` — incoming notification
- `user:online` / `user:offline` — presence events
- `users:online` — full online list on connect
- `project:updated` — project status change

---

## 🌱 Sample Login Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | aditya.k@ems.local | pass1234 |
| Manager | priya.n@ems.local | pass1234 |
| Employee | ravi.d@ems.local | pass1234 |

