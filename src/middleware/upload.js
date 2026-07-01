// src/middleware/upload.js
// Demonstrates: File Uploads (Task App topic), Multer, Node.js fs module

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (Node.js fs module demo)
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // employee_<id>_<timestamp>.ext  — unique, no collision
    const ext = path.extname(file.originalname);
    const name = `employee_${req.employee._id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;
