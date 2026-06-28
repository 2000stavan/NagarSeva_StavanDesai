import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] Mock send to ${to}: ${subject}`);
    return;
  }
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function notifyResolution(userId, issue) {
  const pool = (await import('../config/db.js')).default;
  const message = `Your reported issue "${issue.title}" has been resolved. How would you rate the resolution? ⭐⭐⭐⭐⭐`;
  await pool.query(
    'INSERT INTO notifications (user_id, issue_id, message) VALUES ($1, $2, $3)',
    [userId, issue.id, message]
  );
  const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  if (rows[0]?.email) {
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/issues/${issue.id}`;
    await sendEmail(
      rows[0].email,
      `Issue Resolved: ${issue.title}`,
      `<p>${message}</p><p><a href="${link}">Rate this resolution</a></p>`
    );
  }
}

export async function sendEscalationEmail(to, subject, body) {
  await sendEmail(to, subject, body);
}
