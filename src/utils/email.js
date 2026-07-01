// src/utils/email.js
// Demonstrates: Sending Emails (Task App topic), Nodemailer, async/await,
//               Node.js File System (fs.readFileSync)

const nodemailer = require('nodemailer');
const fs = require('fs');

// ── Read EMAIL_PASS from a local file ─────────────────────────
// Useful in dev when you don't want to put credentials in .env
// The file should contain just the app-password text, nothing else.
const passwordFile = 'D:/Projects/delete/shridhar-gmail-app-password.txt';

let EMAIL_PASS = process.env.EMAIL_PASS; // fallback to .env

try {
  EMAIL_PASS = fs.readFileSync(passwordFile, 'utf-8').trim();
  console.log('🔑 EMAIL_PASS loaded from file');
} catch (err) {
  // File not found or unreadable — fall back to .env value
  console.warn(`⚠️  Could not read password file (${err.code}). Falling back to EMAIL_PASS from .env`);
}

// ── Create transporter (reused across calls) ──────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // TLS (STARTTLS on port 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: EMAIL_PASS,           // ← from file (or .env fallback)
  },
});

/**
 * Send a welcome email to a newly created employee.
 * Skipped automatically in test/dev when EMAIL_USER is not set.
 */
const sendWelcomeEmail = async ({ to, firstName }) => {
  const mailOptions = {
    from: `"EMS System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to the Team! 🎉',
    html: `
      <h2>Hello, ${firstName}!</h2>
      <p>Your EMS account has been created successfully.</p>
      <p>Log in at <a href="http://localhost:${process.env.PORT || 3000}">EMS Portal</a>.</p>
      <p>— HR Team</p>
    `,
  };

  if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER) {
    console.log(`📧 [EMAIL SKIPPED] Would send welcome mail to ${to}`);
    return;
  }

  await transporter.sendMail(mailOptions);
  console.log(`📧 Welcome email sent to ${to}`);
};

module.exports = { sendWelcomeEmail };

// // src/utils/email.js
// // Demonstrates: Sending Emails (Task App topic), Nodemailer, async/await

// const nodemailer = require('nodemailer');

// // Create transporter once (reuse across calls)
// const transporter = nodemailer.createTransport({
//   host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
//   port:   parseInt(process.env.EMAIL_PORT) || 587,
//   secure: false, // TLS
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// /**
//  * Send a welcome email to a newly created employee.
//  * In dev/test, we just log instead of actually sending.
//  */
// const sendWelcomeEmail = async ({ to, firstName }) => {
//   const mailOptions = {
//     from: `"EMS System" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: 'Welcome to the Team! 🎉',
//     html: `
//       <h2>Hello, ${firstName}!</h2>
//       <p>Your EMS account has been created successfully.</p>
//       <p>Log in at <a href="http://localhost:${process.env.PORT || 3000}">EMS Portal</a>.</p>
//       <p>— HR Team</p>
//     `,
//   };

//   if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER) {
//     // Don't actually send in test/dev without credentials
//     console.log(`📧 [EMAIL SKIPPED] Would send welcome mail to ${to}`);
//     return;
//   }

//   await transporter.sendMail(mailOptions);
//   console.log(`📧 Welcome email sent to ${to}`);
// };

// module.exports = { sendWelcomeEmail };
