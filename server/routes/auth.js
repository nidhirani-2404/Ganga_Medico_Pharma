import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'village_medical_store_secret_jwt_key_2026';

// 1. Staff Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please provide both username and password.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Please provide old and new passwords.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect old password.' });
    }

    // Hash & Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get all staff (Admin only)
router.get('/staff', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role, full_name, created_at FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Create new staff member (Admin only)
router.post('/staff', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role, fullName } = req.body;

  if (!username || !password || !role || !fullName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      [username, passwordHash, role, fullName]
    );

    res.status(201).json({
      message: 'Staff member created successfully.',
      id: result.insertId,
      username,
      role,
      fullName
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Delete staff member (Admin only)
router.delete('/staff/:id', authenticateToken, requireAdmin, async (req, res) => {
  const staffId = req.params.id;

  if (parseInt(staffId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [staffId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
