import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
router.post('/login', async (req, res) => {
  const { email, name } = req.body;
  try {
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];
    if (!user) {
      const newUserResult = await pool.query('INSERT INTO users (email, full_name) VALUES ($1, $2) RETURNING *', [email, name]);
      user = newUserResult.rows[0];
    }
    const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: '10m' });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 10 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, isAdmin: user.is_admin, publicKey: user.public_key, encryptedPrivateKey: user.encrypted_private_key, hasMasterPassword: !!user.master_password_hash } });
  } catch (error) { res.status(500).json({ message: 'Login failed' }); }
});
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});
export default router;
