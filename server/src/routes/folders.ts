import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
const router = express.Router();
router.get('/', authenticateToken, async (req: any, res) => {
  const result = await pool.query('SELECT DISTINCT f.* FROM folders f JOIN group_folders gf ON f.id = gf.folder_id JOIN user_groups ug ON gf.group_id = ug.group_id WHERE ug.user_id = $1', [req.user.id]);
  res.json(result.rows);
});
router.post('/', authenticateToken, async (req: any, res) => {
  const { name, groupIds, encryptedFolderKeys } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const f = await client.query('INSERT INTO folders (name) VALUES ($1) RETURNING id', [name]);
    for (const g of groupIds) await client.query('INSERT INTO group_folders (group_id, folder_id) VALUES ($1, $2)', [g, f.rows[0].id]);
    for (const [u, k] of Object.entries(encryptedFolderKeys)) await client.query('INSERT INTO user_folder_keys (user_id, folder_id, encrypted_folder_key) VALUES ($1, $2, $3)', [u, f.rows[0].id, k]);
    await client.query('COMMIT');
    res.status(201).json({ id: f.rows[0].id, name });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ message: 'Failed' }); } finally { client.release(); }
});
router.get('/:folderId/credentials', authenticateToken, async (req: any, res) => {
  const key = await pool.query('SELECT encrypted_folder_key FROM user_folder_keys WHERE user_id = $1 AND folder_id = $2', [req.user.id, req.params.folderId]);
  const creds = await pool.query('SELECT * FROM credentials WHERE folder_id = $1', [req.params.folderId]);
  res.json({ encryptedFolderKey: key.rows[0]?.encrypted_folder_key, credentials: creds.rows });
});
export default router;
