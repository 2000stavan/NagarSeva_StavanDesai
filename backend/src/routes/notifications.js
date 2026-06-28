import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getNotifications, getUnreadCount } from '../services/notifications.js';
import pool from '../config/db.js';

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const notifications = await getNotifications(req.user.id);
  const unread = await getUnreadCount(req.user.id);
  res.json({ notifications, unread });
});

router.patch('/:id/read', authRequired, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

router.patch('/read-all', authRequired, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
});

export default router;
