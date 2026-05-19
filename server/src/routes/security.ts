import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
const router = express.Router();
router.post('/initialize', authenticateToken, async (req: any, res) => {
  const { publicKey, encryptedPrivateKey, masterPasswordHash } = req.body;
  const userId = req.user.id;
  try {
    await pool.query('UPDATE users SET public_key = $1, encrypted_private_key = $2, master_password_hash = $3 WHERE id = $4', [publicKey, encryptedPrivateKey, masterPasswordHash, userId]);
    res.json({ message: 'Security initialized' });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
});
router.post('/verify-master', authenticateToken, async (req: any, res) => {
  const { masterPasswordHash } = req.body;
  const userId = req.user.id;
  try {
    const result = await pool.query('SELECT master_password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows[0].master_password_hash === masterPasswordHash) res.json({ verified: true });
    else res.status(401).json({ verified: false });
  } catch (error) { res.status(500).json({ message: 'Failed' }); }
});
export default router;
