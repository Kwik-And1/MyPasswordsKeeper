import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
const router = express.Router();
router.post('/', authenticateToken, async (req: any, res) => {
  const { folderId, title, username, encryptedPassword, url, notes } = req.body;
  const result = await pool.query('INSERT INTO credentials (folder_id, title, username, encrypted_password, url, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [folderId, title, username, encryptedPassword, url, notes]);
  res.status(201).json(result.rows[0]);
});
router.put('/:id', authenticateToken, async (req: any, res) => {
  const { title, username, encryptedPassword, url, notes } = req.body;
  const result = await pool.query('UPDATE credentials SET title = $1, username = $2, encrypted_password = $3, url = $4, notes = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *', [title, username, encryptedPassword, url, notes, req.params.id]);
  res.json(result.rows[0]);
});
export default router;
