import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Setup customer photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/images';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'customer_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed!'));
  }
});

// 1. Get Customers (All or Searched)
router.get('/', authenticateToken, async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR mobile LIKE ? OR village LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY name ASC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// 2. Get Single Customer + History
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get customer detail
    const [custRows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (custRows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const customer = custRows[0];

    // 2. Get purchase history (sales)
    const [salesRows] = await db.query(
      'SELECT id, invoice_number, total_amount, payment_method, sale_date FROM sales WHERE customer_id = ? ORDER BY sale_date DESC',
      [id]
    );

    res.json({
      customer,
      purchases: salesRows
    });
  } catch (error) {
    console.error('Fetch customer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch customer profile.' });
  }
});

// 3. Add Customer
router.post('/', authenticateToken, requireStaffOrAdmin, upload.single('photo'), async (req, res) => {
  const { name, mobile, address, village, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const photoUrl = req.file ? `/uploads/images/${req.file.filename}` : null;

  try {
    const [result] = await db.query(
      'INSERT INTO customers (name, mobile, address, village, photo_url, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, mobile || null, address || null, village || null, photoUrl, notes || null]
    );

    res.status(201).json({
      message: 'Customer added successfully.',
      id: result.insertId
    });
  } catch (error) {
    console.error('Add customer error:', error);
    res.status(500).json({ error: 'Failed to add customer.' });
  }
});

// 4. Update Customer
router.put('/:id', authenticateToken, requireStaffOrAdmin, upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, village, notes, keepPhoto } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  try {
    const [existing] = await db.query('SELECT photo_url FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    let photoUrl = existing[0].photo_url;
    if (req.file) {
      photoUrl = `/uploads/images/${req.file.filename}`;
      // delete old photo if exists
      if (existing[0].photo_url) {
        const oldPath = path.join(path.resolve(), existing[0].photo_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } else if (keepPhoto === 'false' && existing[0].photo_url) {
      const oldPath = path.join(path.resolve(), existing[0].photo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      photoUrl = null;
    }

    await db.query(
      'UPDATE customers SET name = ?, mobile = ?, address = ?, village = ?, photo_url = ?, notes = ? WHERE id = ?',
      [name, mobile || null, address || null, village || null, photoUrl, notes || null, id]
    );

    res.json({ message: 'Customer updated successfully.' });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// 5. Delete Customer
router.delete('/:id', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await db.query('SELECT photo_url FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Delete photo if exists
    if (existing[0].photo_url) {
      const oldPath = path.join(path.resolve(), existing[0].photo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

export default router;
