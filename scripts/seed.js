// scripts/seed.js
// Run: node scripts/seed.js
// Demonstrates: Node.js scripting, async/await, Mongoose bulk operations,
//               JavaScript arrays & objects

require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('../src/models/Department');
const Employee = require('../src/models/Employee');
const Project = require('../src/models/Project');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';

// ── Seed data defined as JS objects & arrays ──────────────────
const departments = [
  { name: 'Engineering',  code: 'ENG',  location: 'Bengaluru', budget: 5000000 },
  { name: 'HR',           code: 'HR',   location: 'Mumbai',    budget: 1000000 },
  { name: 'Finance',      code: 'FIN',  location: 'Pune',      budget: 2000000 },
  { name: 'Marketing',    code: 'MKT',  location: 'Delhi',     budget: 1500000 },
];

const getEmployees = (deptMap) => [
  {
    firstName: 'Aditya', lastName: 'Kulkarni',
    email: 'aditya.k@ems.local', password: 'pass1234',
    role: 'admin', designation: 'CTO', salary: 200000,
    department: deptMap['ENG'],
  },
  {
    firstName: 'Priya', lastName: 'Nair',
    email: 'priya.n@ems.local', password: 'pass1234',
    role: 'manager', designation: 'Engineering Manager', salary: 150000,
    department: deptMap['ENG'],
  },
  {
    firstName: 'Ravi', lastName: 'Deshmukh',
    email: 'ravi.d@ems.local', password: 'pass1234',
    role: 'employee', designation: 'Backend Developer', salary: 90000,
    department: deptMap['ENG'],
  },
  {
    firstName: 'Sunita', lastName: 'Patil',
    email: 'sunita.p@ems.local', password: 'pass1234',
    role: 'manager', designation: 'HR Manager', salary: 100000,
    department: deptMap['HR'],
  },
  {
    firstName: 'Vikram', lastName: 'Mehta',
    email: 'vikram.m@ems.local', password: 'pass1234',
    role: 'employee', designation: 'Financial Analyst', salary: 85000,
    department: deptMap['FIN'],
  },
];

const getProjects = (deptMap, empIds) => [
  {
    name: 'EMS Cloud Migration',
    description: 'Migrate on-prem EMS to AWS',
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    budget: 2000000,
    department: deptMap['ENG'],
    assignedEmployees: empIds.slice(0, 3),
    tags: ['cloud', 'aws', 'migration'],
  },
  {
    name: 'HR Digital Portal',
    description: 'Self-service HR portal for employees',
    status: 'planning',
    budget: 500000,
    department: deptMap['HR'],
    assignedEmployees: empIds.slice(1, 4),
    tags: ['portal', 'hr', 'react'],
  },
];

// ── Main seed function ────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Department.deleteMany({}),
      Employee.deleteMany({}),
      Project.deleteMany({}),
    ]);
    console.log('🧹 Cleared existing data');

    // Insert departments
    const createdDepts = await Department.insertMany(departments);
    const deptMap = {};
    createdDepts.forEach((d) => (deptMap[d.code] = d._id));
    console.log(`✅ Created ${createdDepts.length} departments`);

    // Insert employees (save individually for pre-save hook / password hash)
    const employeeSeedData = getEmployees(deptMap);
    const createdEmployees = [];
    for (const data of employeeSeedData) {
      const emp = new Employee(data);
      await emp.save();
      createdEmployees.push(emp);
    }
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Insert projects
    const empIds = createdEmployees.map((e) => e._id);
    const projectSeedData = getProjects(deptMap, empIds);
    const createdProjects = await Project.insertMany(projectSeedData);
    console.log(`✅ Created ${createdProjects.length} projects`);

    console.log('\n🎉 Seed complete!\n');
    console.log('Login credentials:');
    console.log('  Admin:   aditya.k@ems.local / pass1234');
    console.log('  Manager: priya.n@ems.local  / pass1234');
    console.log('  Employee: ravi.d@ems.local  / pass1234');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
