import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import securityRoutes from './routes/security';
import adminRoutes from './routes/admin';
import folderRoutes from './routes/folders';
import credentialRoutes from './routes/credentials';
import { authenticateToken } from './middleware/auth';
import jwt from 'jsonwebtoken';
dotenv.config();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const p = jwt.verify(token, JWT_SECRET) as any;
      const t = jwt.sign({ id: p.id, email: p.email, isAdmin: p.isAdmin }, JWT_SECRET, { expiresIn: '10m' });
      res.cookie('token', t, { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 10 * 60 * 1000 });
    } catch (e) {}
  }
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/credentials', credentialRoutes);
app.get('/api/me', authenticateToken, (req: any, res) => res.json({ user: req.user }));
app.listen(3001, () => console.log('3001'));
