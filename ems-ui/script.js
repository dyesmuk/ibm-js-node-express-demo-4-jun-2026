// script.js — EMS UI
// Modern JS: const/let, async/await, destructuring, template literals,
// arrow functions, Map, optional chaining, fetch API

const API = 'http://localhost:3000/api';
const WS  = 'http://localhost:3000';

// ── State ─────────────────────────────────────────────────────
const state = {
  token:    localStorage.getItem('ems_token'),
  employee: JSON.parse(localStorage.getItem('ems_user') || 'null'),
  page:     'dashboard',
  depts:    [],           // cached department list
};

// ── DOM refs ──────────────────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const loginForm    = $('body > form');
const appSection   = $('body > section');
const nav          = $('nav');
const mainArea     = $('main');
const topbarTitle  = $('#page-title');
const statusDot    = $('#status-dot');
const toastArea    = $('aside');
const modalEl      = $('dialog');
const contentArea  = $('#content');
const statusHeader = $('header');

// ── Auth ──────────────────────────────────────────────────────
const isAuthed = () => !!state.token;

const saveAuth = (token, employee) => {
  state.token    = token;
  state.employee = employee;
  localStorage.setItem('ems_token', token);
  localStorage.setItem('ems_user',  JSON.stringify(employee));
};

const clearAuth = () => {
  state.token    = null;
  state.employee = null;
  localStorage.removeItem('ems_token');
  localStorage.removeItem('ems_user');
};

// ── API helpers ───────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(state.token && { Authorization: `Bearer ${state.token}` }),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const get    = (path)         => apiFetch(path);
const post   = (path, body)   => apiFetch(path, { method: 'POST',   body });
const patch  = (path, body)   => apiFetch(path, { method: 'PATCH',  body });
const del    = (path)         => apiFetch(path, { method: 'DELETE' });

// ── Toast ─────────────────────────────────────────────────────
const toast = (msg, type = 'info', ms = 3500) => {
  const el = document.createElement('output');
  el.textContent = msg;
  if (type !== 'info') el.dataset.type = type;
  toastArea.appendChild(el);
  setTimeout(() => el.remove(), ms);
};

// ── Socket.io ─────────────────────────────────────────────────
let socket = null;

const connectSocket = () => {
  if (!window.io) return;

  socket = io(WS);
  setStatus('connecting');

  socket.on('connect', () => {
    setStatus('connected');
    if (state.employee) {
      socket.emit('identify', {
        employeeId: state.employee._id,
        name: `${state.employee.firstName} ${state.employee.lastName}`,
      });
    }
  });

  socket.on('disconnect', () => setStatus('disconnected'));

  socket.on('notification', ({ message, type }) => toast(`🔔 ${message}`, type));

  socket.on('project:updated', ({ projectName, status }) =>
    toast(`Project "${projectName}" → ${status}`, 'info')
  );

  socket.on('user:online',  ({ name }) => toast(`${name} came online`, 'info', 2000));
};

const setStatus = (s) => {
  statusHeader.dataset.status = s;
  statusDot.dataset.status    = s;
  statusDot.textContent       = s === 'connected' ? 'Live' : s === 'connecting' ? 'Connecting…' : 'Offline';
};

// ── Modal helper ──────────────────────────────────────────────
const openModal = (title, bodyHTML, onSubmit) => {
  $('dialog > header > h2').textContent = title;
  const form = $('dialog > form');
  $('dialog > form > fieldset').innerHTML = bodyHTML;

  // Remove old listener by replacing the footer
  const footer = $('dialog > form > footer');
  footer.innerHTML = `
    <button type="button" data-variant="ghost" id="modal-cancel">Cancel</button>
    <button type="submit" id="modal-submit">Save</button>
  `;

  $('#modal-cancel').onclick = () => modalEl.close();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#modal-submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await onSubmit(new FormData(form));
      modalEl.close();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  };

  modalEl.showModal();
};

// ── Pagination state per page ─────────────────────────────────
const pages = { employees: 1, departments: 1, projects: 1 };
const search = { employees: '', departments: '', projects: '' };

// ════════════════════════════════════════════════════════════════
// VIEWS
// ════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────
const renderDashboard = async () => {
  topbarTitle.textContent = 'Dashboard';
  contentArea.innerHTML = `<p>Loading…</p>`;

  try {
    const [empRes, deptRes, projRes] = await Promise.all([
      get('/employees?limit=1'),
      get('/departments?limit=1'),
      get('/projects?limit=1'),
    ]);

    const activeEmp  = await get('/employees?isActive=true&limit=1');
    const activeProj = await get('/projects?status=active&limit=1');

    contentArea.innerHTML = `
      <ul>
        <li>
          <span>Total Employees</span>
          <strong>${empRes.pagination.total}</strong>
          <small>${activeEmp.pagination.total} active</small>
        </li>
        <li>
          <span>Departments</span>
          <strong>${deptRes.pagination.total}</strong>
          <small>across the org</small>
        </li>
        <li>
          <span>Projects</span>
          <strong>${projRes.pagination.total}</strong>
          <small>${activeProj.pagination.total} active</small>
        </li>
        <li>
          <span>Logged in as</span>
          <strong style="font-size:16px">${state.employee?.firstName ?? '—'}</strong>
          <small><span data-badge="${state.employee?.role}">${state.employee?.role}</span></small>
        </li>
      </ul>

      <h2>Recent Employees</h2>
    `;

    // Recent employees mini-table
    const recent = await get('/employees?limit=5&sortBy=createdAt:desc');
    contentArea.innerHTML += buildEmployeeTable(recent.data, false);

    contentArea.innerHTML += `<h2 style="margin-top:24px">Recent Projects</h2>`;
    const recentProj = await get('/projects?limit=5&sortBy=createdAt:desc');
    contentArea.innerHTML += buildProjectTable(recentProj.data, false);

  } catch (err) {
    contentArea.innerHTML = `<p>${err.message}</p>`;
  }
};

// ── Employees ─────────────────────────────────────────────────
const renderEmployees = async () => {
  topbarTitle.textContent = 'Employees';
  const pg = pages.employees;
  const q  = search.employees;

  contentArea.innerHTML = `
    <div>
      <input type="search" placeholder="Search name or email…" id="emp-search" value="${q}">
      <select id="emp-active-filter">
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      ${canManage() ? `<button id="emp-add" data-variant="sm">+ Add Employee</button>` : ''}
    </div>
    <p>Loading…</p>
  `;

  // Search wiring
  let searchTimer;
  $('#emp-search').oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      search.employees = e.target.value;
      pages.employees  = 1;
      renderEmployees();
    }, 300);
  };

  $('#emp-active-filter').onchange = () => renderEmployees();

  if (canManage()) {
    $('#emp-add').onclick = () => openAddEmployeeModal();
  }

  try {
    const filter = $('#emp-active-filter')?.value ?? '';
    let url = `/employees?page=${pg}&limit=10&sortBy=firstName:asc`;
    if (q)      url += `&search=${encodeURIComponent(q)}`;
    if (filter) url += `&isActive=${filter}`;

    const res = await get(url);

    // Replace loading placeholder
    contentArea.querySelector('p')?.remove();
    contentArea.appendChild(
      htmlToNode(buildEmployeeTable(res.data, true))
    );

    renderPagination(contentArea, res.pagination, (p) => {
      pages.employees = p;
      renderEmployees();
    });

  } catch (err) {
    toast(err.message, 'error');
  }
};

const buildEmployeeTable = (employees, actions = true) => {
  if (!employees.length) return `<p>No employees found.</p>`;

  const rows = employees.map(e => `
    <tr>
      <td><strong>${e.firstName} ${e.lastName}</strong></td>
      <td>${e.email}</td>
      <td>${e.designation || '—'}</td>
      <td>${e.department?.name ?? '—'}</td>
      <td><span data-badge="${e.isActive ? 'active' : 'inactive'}">${e.isActive ? 'Active' : 'Inactive'}</span></td>
      <td><span data-badge="${e.role}">${e.role}</span></td>
      ${actions && canAdmin() ? `
        <td>
          <button data-variant="sm" data-variant="ghost" onclick="editEmployee('${e._id}')">Edit</button>
          <button data-variant="sm" data-variant="danger" onclick="deleteEmployee('${e._id}','${e.firstName}')">Del</button>
        </td>` : '<td></td>'}
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Designation</th>
          <th>Department</th><th>Status</th><th>Role</th>
          ${actions ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const openAddEmployeeModal = async () => {
  await loadDepts();
  const deptOptions = state.depts.map(d => `<option value="${d._id}">${d.name}</option>`).join('');

  openModal('Add Employee', `
    <label>First Name <input name="firstName" required></label>
    <label>Last Name  <input name="lastName"  required></label>
    <label>Email      <input name="email" type="email" required></label>
    <label>Password   <input name="password" type="password" required minlength="6"></label>
    <label>Designation <input name="designation"></label>
    <label>Role
      <select name="role">
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
    </label>
    <label>Department
      <select name="department">
        <option value="">— None —</option>
        ${deptOptions}
      </select>
    </label>
    <label>Salary <input name="salary" type="number" min="0"></label>
  `, async (fd) => {
    const body = Object.fromEntries(
      [...fd.entries()].filter(([,v]) => v !== '')
    );
    if (body.salary) body.salary = Number(body.salary);
    await post('/employees', body);
    toast('Employee created', 'success');
    renderEmployees();
  });
};

// expose to inline onclick
window.editEmployee = async (id) => {
  await loadDepts();
  const emp = await get(`/employees/${id}`);
  const deptOptions = state.depts.map(d =>
    `<option value="${d._id}" ${emp.department?._id === d._id ? 'selected' : ''}>${d.name}</option>`
  ).join('');

  openModal('Edit Employee', `
    <label>First Name  <input name="firstName"  value="${emp.firstName}"></label>
    <label>Last Name   <input name="lastName"   value="${emp.lastName}"></label>
    <label>Phone       <input name="phone"      value="${emp.phone || ''}"></label>
    <label>Designation <input name="designation" value="${emp.designation || ''}"></label>
    <label>Salary      <input name="salary" type="number" value="${emp.salary || ''}"></label>
    <label>Role
      <select name="role">
        ${['employee','manager','admin'].map(r =>
          `<option value="${r}" ${emp.role===r?'selected':''}>${r}</option>`
        ).join('')}
      </select>
    </label>
    <label>Department
      <select name="department">
        <option value="">— None —</option>
        ${deptOptions}
      </select>
    </label>
    <label>Active
      <select name="isActive">
        <option value="true"  ${emp.isActive  ? 'selected' : ''}>Active</option>
        <option value="false" ${!emp.isActive ? 'selected' : ''}>Inactive</option>
      </select>
    </label>
  `, async (fd) => {
    const body = Object.fromEntries(
      [...fd.entries()].filter(([,v]) => v !== '')
    );
    if (body.salary)   body.salary   = Number(body.salary);
    if (body.isActive) body.isActive = body.isActive === 'true';
    await patch(`/employees/${id}`, body);
    toast('Employee updated', 'success');
    renderEmployees();
  });
};

window.deleteEmployee = async (id, name) => {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await del(`/employees/${id}`);
    toast(`${name} deleted`, 'success');
    renderEmployees();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ── Departments ───────────────────────────────────────────────
const renderDepartments = async () => {
  topbarTitle.textContent = 'Departments';

  contentArea.innerHTML = `
    <div>
      <span style="flex:1"></span>
      ${canAdmin() ? `<button id="dept-add" data-variant="sm">+ Add Department</button>` : ''}
    </div>
    <p>Loading…</p>
  `;

  if (canAdmin()) {
    $('#dept-add').onclick = () => openAddDeptModal();
  }

  try {
    const res = await get(`/departments?page=${pages.departments}&limit=10`);
    contentArea.querySelector('p')?.remove();
    contentArea.appendChild(htmlToNode(buildDeptTable(res.data)));
    renderPagination(contentArea, res.pagination, (p) => {
      pages.departments = p;
      renderDepartments();
    });
  } catch (err) {
    toast(err.message, 'error');
  }
};

const buildDeptTable = (depts) => {
  if (!depts.length) return `<p>No departments found.</p>`;

  const rows = depts.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td style="font-family:var(--mono);font-size:12px">${d.code}</td>
      <td>${d.location || '—'}</td>
      <td>₹${(d.budget || 0).toLocaleString()}</td>
      <td>${d.description || '—'}</td>
      ${canAdmin() ? `
        <td>
          <button data-variant="sm" onclick="editDept('${d._id}')">Edit</button>
          <button data-variant="sm" data-variant="danger" onclick="deleteDept('${d._id}','${d.name}')">Del</button>
        </td>` : '<td></td>'}
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Code</th><th>Location</th><th>Budget</th><th>Description</th>
          ${canAdmin() ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const openAddDeptModal = () => {
  openModal('Add Department', `
    <label>Name        <input name="name" required></label>
    <label>Code        <input name="code" required placeholder="e.g. ENG" style="text-transform:uppercase"></label>
    <label>Location    <input name="location"></label>
    <label>Budget (₹)  <input name="budget" type="number" min="0"></label>
    <label>Description <textarea name="description"></textarea></label>
  `, async (fd) => {
    const body = Object.fromEntries([...fd.entries()].filter(([,v]) => v !== ''));
    if (body.budget) body.budget = Number(body.budget);
    body.code = body.code?.toUpperCase();
    await post('/departments', body);
    toast('Department created', 'success');
    state.depts = []; // invalidate cache
    renderDepartments();
  });
};

window.editDept = async (id) => {
  const dept = await get(`/departments/${id}`);
  openModal('Edit Department', `
    <label>Name        <input name="name"     value="${dept.name}"></label>
    <label>Location    <input name="location" value="${dept.location || ''}"></label>
    <label>Budget (₹)  <input name="budget" type="number" value="${dept.budget || 0}"></label>
    <label>Description <textarea name="description">${dept.description || ''}</textarea></label>
  `, async (fd) => {
    const body = Object.fromEntries([...fd.entries()].filter(([,v]) => v !== ''));
    if (body.budget) body.budget = Number(body.budget);
    await patch(`/departments/${id}`, body);
    toast('Department updated', 'success');
    state.depts = [];
    renderDepartments();
  });
};

window.deleteDept = async (id, name) => {
  if (!confirm(`Delete department "${name}"?`)) return;
  try {
    await del(`/departments/${id}`);
    toast(`${name} deleted`, 'success');
    state.depts = [];
    renderDepartments();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ── Projects ──────────────────────────────────────────────────
const renderProjects = async () => {
  topbarTitle.textContent = 'Projects';

  contentArea.innerHTML = `
    <div>
      <select id="proj-status-filter">
        <option value="">All Status</option>
        <option value="planning">Planning</option>
        <option value="active">Active</option>
        <option value="on-hold">On Hold</option>
        <option value="completed">Completed</option>
      </select>
      ${canManage() ? `<button id="proj-add" data-variant="sm">+ Add Project</button>` : ''}
    </div>
    <p>Loading…</p>
  `;

  $('#proj-status-filter').onchange = () => renderProjects();
  if (canManage()) $('#proj-add').onclick = () => openAddProjectModal();

  try {
    const statusF = $('#proj-status-filter')?.value ?? '';
    let url = `/projects?page=${pages.projects}&limit=10`;
    if (statusF) url += `&status=${statusF}`;

    const res = await get(url);
    contentArea.querySelector('p')?.remove();
    contentArea.appendChild(htmlToNode(buildProjectTable(res.data, true)));
    renderPagination(contentArea, res.pagination, (p) => {
      pages.projects = p;
      renderProjects();
    });
  } catch (err) {
    toast(err.message, 'error');
  }
};

const buildProjectTable = (projects, actions = true) => {
  if (!projects.length) return `<p>No projects found.</p>`;

  const rows = projects.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.department?.name ?? '—'}</td>
      <td><span data-badge="${p.status}">${p.status}</span></td>
      <td>${p.assignedEmployees?.length ?? 0} people</td>
      <td>₹${(p.budget || 0).toLocaleString()}</td>
      ${actions && canManage() ? `
        <td>
          <button data-variant="sm" onclick="editProject('${p._id}')">Edit</button>
          ${canAdmin() ? `<button data-variant="sm" data-variant="danger" onclick="deleteProject('${p._id}','${p.name}')">Del</button>` : ''}
        </td>` : '<td></td>'}
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Department</th><th>Status</th><th>Team</th><th>Budget</th>
          ${actions ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const openAddProjectModal = async () => {
  await loadDepts();
  const deptOptions = state.depts.map(d => `<option value="${d._id}">${d.name}</option>`).join('');

  openModal('Add Project', `
    <label>Name        <input name="name" required></label>
    <label>Department
      <select name="department" required>
        <option value="">Select department…</option>
        ${deptOptions}
      </select>
    </label>
    <label>Status
      <select name="status">
        <option value="planning">Planning</option>
        <option value="active">Active</option>
        <option value="on-hold">On Hold</option>
        <option value="completed">Completed</option>
      </select>
    </label>
    <label>Budget (₹) <input name="budget" type="number" min="0"></label>
    <label>Start Date  <input name="startDate" type="date"></label>
    <label>End Date    <input name="endDate"   type="date"></label>
    <label>Description <textarea name="description"></textarea></label>
  `, async (fd) => {
    const body = Object.fromEntries([...fd.entries()].filter(([,v]) => v !== ''));
    if (body.budget) body.budget = Number(body.budget);
    await post('/projects', body);
    toast('Project created', 'success');
    renderProjects();
  });
};

window.editProject = async (id) => {
  await loadDepts();
  const proj = await get(`/projects/${id}`);
  const deptOptions = state.depts.map(d =>
    `<option value="${d._id}" ${proj.department?._id === d._id ? 'selected' : ''}>${d.name}</option>`
  ).join('');

  openModal('Edit Project', `
    <label>Name <input name="name" value="${proj.name}"></label>
    <label>Department
      <select name="department">
        ${deptOptions}
      </select>
    </label>
    <label>Status
      <select name="status">
        ${['planning','active','on-hold','completed'].map(s =>
          `<option value="${s}" ${proj.status===s?'selected':''}>${s}</option>`
        ).join('')}
      </select>
    </label>
    <label>Budget (₹) <input name="budget" type="number" value="${proj.budget || 0}"></label>
    <label>Description <textarea name="description">${proj.description || ''}</textarea></label>
  `, async (fd) => {
    const body = Object.fromEntries([...fd.entries()].filter(([,v]) => v !== ''));
    if (body.budget) body.budget = Number(body.budget);
    await patch(`/projects/${id}`, body);
    // Also emit socket event for live update demo
    socket?.emit('project:update', { projectId: id, projectName: body.name || proj.name, status: body.status || proj.status });
    toast('Project updated', 'success');
    renderProjects();
  });
};

window.deleteProject = async (id, name) => {
  if (!confirm(`Delete project "${name}"?`)) return;
  try {
    await del(`/projects/${id}`);
    toast(`${name} deleted`, 'success');
    renderProjects();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ── Profile ───────────────────────────────────────────────────
const renderProfile = async () => {
  topbarTitle.textContent = 'My Profile';
  try {
    const me = await get('/auth/me');
    contentArea.innerHTML = `
      <dl>
        <dt>Full Name</dt>   <dd>${me.firstName} ${me.lastName}</dd>
        <dt>Email</dt>       <dd>${me.email}</dd>
        <dt>Role</dt>        <dd><span data-badge="${me.role}">${me.role}</span></dd>
        <dt>Designation</dt> <dd>${me.designation || '—'}</dd>
        <dt>Department</dt>  <dd>${me.department?.name ?? '—'}</dd>
        <dt>Joined</dt>      <dd>${new Date(me.joinDate || me.createdAt).toLocaleDateString()}</dd>
        <dt>Status</dt>      <dd><span data-badge="${me.isActive?'active':'inactive'}">${me.isActive?'Active':'Inactive'}</span></dd>
      </dl>
      <button id="change-pwd-btn">Change Password</button>
    `;
    $('#change-pwd-btn').onclick = () => openChangePasswordModal(me._id);
  } catch (err) {
    toast(err.message, 'error');
  }
};

const openChangePasswordModal = (id) => {
  openModal('Change Password', `
    <label>New Password <input name="password" type="password" required minlength="6"></label>
  `, async (fd) => {
    await patch(`/employees/${id}`, { password: fd.get('password') });
    toast('Password updated', 'success');
  });
};

// ── Helpers ───────────────────────────────────────────────────
const canAdmin   = () => state.employee?.role === 'admin';
const canManage  = () => ['admin','manager'].includes(state.employee?.role);

const loadDepts = async () => {
  if (state.depts.length) return;
  const res = await get('/departments?limit=100');
  state.depts = res.data;
};

const htmlToNode = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

const renderPagination = (container, pg, onPage) => {
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <span>Page ${pg.page} of ${pg.totalPages} — ${pg.total} records</span>
    <div>
      <button data-variant="ghost" data-variant="sm" ${!pg.hasPrevPage ? 'disabled' : ''} id="pg-prev">← Prev</button>
      <button data-variant="ghost" data-variant="sm" ${!pg.hasNextPage ? 'disabled' : ''} id="pg-next">Next →</button>
    </div>
  `;
  footer.querySelector('#pg-prev')?.addEventListener('click', () => onPage(pg.page - 1));
  footer.querySelector('#pg-next')?.addEventListener('click', () => onPage(pg.page + 1));
  container.appendChild(footer);
};

// ── Navigation ────────────────────────────────────────────────
const ROUTES = {
  dashboard:   renderDashboard,
  employees:   renderEmployees,
  departments: renderDepartments,
  projects:    renderProjects,
  profile:     renderProfile,
};

const navigate = (page) => {
  state.page = page;

  // Update active link
  $$('nav > a').forEach(a => {
    if (a.dataset.page === page) a.dataset.active = '';
    else delete a.dataset.active;
  });

  const render = ROUTES[page];
  if (render) render();
};

// ── Login / Logout ────────────────────────────────────────────
const showLogin = () => {
  loginForm.style.display = 'flex';
  appSection.style.display = 'none';
};

const showApp = () => {
  loginForm.style.display = 'none';
  appSection.style.display = 'flex';

  // Populate sidebar user info
  $('nav > footer > strong').textContent =
    `${state.employee.firstName} ${state.employee.lastName}`;
  $('nav > footer > small').textContent = state.employee.role;

  navigate('dashboard');
  connectSocket();
};

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const btn = loginForm.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const data = await post('/auth/login', {
      email:    $('#login-email').value,
      password: $('#login-password').value,
    });
    saveAuth(data.token, data.employee);
    showApp();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
};

$('#logout-btn').onclick = async () => {
  try { await post('/auth/logout', {}); } catch (_) {}
  socket?.disconnect();
  clearAuth();
  showLogin();
  toast('Signed out', 'info', 2000);
};

// Wire nav links
$$('nav > a[data-page]').forEach(a => {
  a.onclick = () => navigate(a.dataset.page);
});

// Close modal on backdrop click
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) modalEl.close();
});

// ── Boot ──────────────────────────────────────────────────────
if (isAuthed()) {
  showApp();
} else {
  showLogin();
}
