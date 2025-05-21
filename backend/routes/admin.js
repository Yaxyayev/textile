import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../models/db.js';
import { authMiddleware } from '../middlewares/auth.js';

dotenv.config();

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (email !== 'admin@example.com') {
    return res.status(401).json({ message: 'Неверный email' });
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Админ не найден' });
    }

    const admin = result.rows[0];
    console.log('🔍 Ввод:', password);
    console.log('🧩 Хэш из базы:', admin.password_hash);
    
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    console.log('✅ Результат compare:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      'my_secret_key_123',
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Успешный вход' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM admins WHERE id = $1', [
      req.admin.id
    ]);
    const admin = result.rows[0];
    res.json({ admin });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка получения данных' });
  }
});

export default router;
