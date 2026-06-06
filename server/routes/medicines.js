import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Setup file upload storage for medicine images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/images';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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

// Helper to determine stock status
function getStockStatus(quantity) {
  if (quantity === 0) return 'Out of Stock';
  if (quantity < 10) return 'Low Stock';
  return 'In Stock';
}

// 1. Get Medicines (All or Searched/Filtered) - Public/Staff
router.get('/', async (req, res) => {
  const { search, category, status } = req.query;
  let query = 'SELECT * FROM medicines WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR brand_name LIKE ? OR manufacturer LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (status && status !== 'All') {
    query += ' AND stock_status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch medicines error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines.' });
  }
});

// 2. Add new medicine
router.post('/', authenticateToken, requireStaffOrAdmin, upload.single('image'), async (req, res) => {
  const {
    name,
    brandName,
    category,
    quantity,
    purchasePrice,
    sellingPrice,
    expiryDate,
    manufacturer,
    description
  } = req.body;

  if (!name || !brandName || !category || !purchasePrice || !sellingPrice || !expiryDate || !manufacturer) {
    return res.status(400).json({ error: 'All fields except image and description are required.' });
  }

  const qty = parseInt(quantity || '0');
  const stockStatus = getStockStatus(qty);
  const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;

  try {
    const [result] = await db.query(
      `INSERT INTO medicines (name, brand_name, category, quantity, purchase_price, selling_price, expiry_date, manufacturer, stock_status, image_url, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, brandName, category, qty, purchasePrice, sellingPrice, expiryDate, manufacturer, stockStatus, imageUrl, description]
    );

    const newMedId = result.insertId;

    // Check alerts and insert notifications if needed
    if (qty === 0) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Out of Stock', `${name} is out of stock.`, newMedId]);
    } else if (qty < 10) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Low Stock', `${name} is running low on stock (${qty} units left).`, newMedId]);
    }

    // Check expiry
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30 && diffDays > 0) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Expiry Warning', `${name} is expiring soon in ${diffDays} days (${expiryDate}).`, newMedId]);
    } else if (diffDays <= 0) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Expiry Warning', `${name} has expired on ${expiryDate}.`, newMedId]);
    }

    res.status(201).json({ message: 'Medicine added successfully.', id: newMedId });
  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ error: 'Failed to add medicine.' });
  }
});

// 3. Edit Medicine
router.put('/:id', authenticateToken, requireStaffOrAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    brandName,
    category,
    quantity,
    purchasePrice,
    sellingPrice,
    expiryDate,
    manufacturer,
    description,
    keepImage
  } = req.body;

  if (!name || !brandName || !category || !purchasePrice || !sellingPrice || !expiryDate || !manufacturer) {
    return res.status(400).json({ error: 'All fields except image are required.' });
  }

  const qty = parseInt(quantity || '0');
  const stockStatus = getStockStatus(qty);

  try {
    // Get existing to handle old image
    const [existing] = await db.query('SELECT image_url FROM medicines WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Medicine not found.' });
    }

    let imageUrl = existing[0].image_url;
    if (req.file) {
      imageUrl = `/uploads/images/${req.file.filename}`;
      // delete old image if exists
      if (existing[0].image_url) {
        const oldPath = path.join(path.resolve(), existing[0].image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } else if (keepImage === 'false' && existing[0].image_url) {
      // delete image completely
      const oldPath = path.join(path.resolve(), existing[0].image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      imageUrl = null;
    }

    await db.query(
      `UPDATE medicines 
       SET name = ?, brand_name = ?, category = ?, quantity = ?, purchase_price = ?, selling_price = ?, expiry_date = ?, manufacturer = ?, stock_status = ?, image_url = ?, description = ? 
       WHERE id = ?`,
      [name, brandName, category, qty, purchasePrice, sellingPrice, expiryDate, manufacturer, stockStatus, imageUrl, description, id]
    );

    // Delete existing alerts for this medicine and re-add if applicable
    await db.query('DELETE FROM notifications WHERE reference_id = ? AND type IN ("Low Stock", "Out of Stock")', [id]);
    if (qty === 0) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Out of Stock', `${name} is out of stock.`, id]);
    } else if (qty < 10) {
      await db.query('INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)', 
        ['Low Stock', `${name} is running low on stock (${qty} units left).`, id]);
    }

    res.json({ message: 'Medicine updated successfully.' });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ error: 'Failed to update medicine.' });
  }
});

// 4. Delete Medicine
router.delete('/:id', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await db.query('SELECT image_url FROM medicines WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Medicine not found.' });
    }

    // Delete image if exists
    if (existing[0].image_url) {
      const oldPath = path.join(path.resolve(), existing[0].image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.query('DELETE FROM medicines WHERE id = ?', [id]);
    // delete related notifications
    await db.query('DELETE FROM notifications WHERE reference_id = ?', [id]);

    res.json({ message: 'Medicine deleted successfully.' });
  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ error: 'Failed to delete medicine.' });
  }
});

export default router;
