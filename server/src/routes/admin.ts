import express from 'express';
import pool from '../db';
import { authenticateToken, isAdmin } from '../middleware/auth';
const router = express.Router();
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, email, full_name, is_admin FROM users');
  res.json(result.rows);
});
router.get('/groups', authenticateToken, isAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM groups');
  res.json(result.rows);
});
router.post('/groups', authenticateToken, isAdmin, async (req, res) => {
  const result = await pool.query('INSERT INTO groups (name) VALUES ($1) RETURNING *', [req.body.name]);
  res.status(201).json(result.rows[0]);
});
export default router;
