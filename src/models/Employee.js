// src/models/Employee.js
// Demonstrates: Mongoose, bcrypt hashing, instance methods, static methods,
//               toJSON transform (hide password), virtual fields

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const employeeSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: 'Please provide a valid email',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // stores filename after upload
      default: null,
    },

    // ── Auth ──────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin'],
      default: 'employee',
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],

    // ── Job Info ──────────────────────────────────────────────
    designation: {
      type: String,
      trim: true,
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Relations ─────────────────────────────────────────────
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
  },
  { timestamps: true }
);

// ── Virtual: full name ────────────────────────────────────────
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save hook: hash password ──────────────────────────────
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Instance method: generate JWT ─────────────────────────────
employeeSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign(
    { _id: this._id.toString(), role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  this.tokens = this.tokens.concat({ token });
  await this.save();
  return token;
};

// ── Instance method: compare password ─────────────────────────
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Static method: find by credentials ────────────────────────
employeeSchema.statics.findByCredentials = async function (email, password) {
  const employee = await this.findOne({ email }).select('+password');
  if (!employee) throw new Error('Invalid email or password');

  const isMatch = await employee.comparePassword(password);
  if (!isMatch) throw new Error('Invalid email or password');

  return employee;
};

// ── toJSON: strip sensitive fields ───────────────────────────
employeeSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.tokens;
  return obj;
};

module.exports = mongoose.model('Employee', employeeSchema);
