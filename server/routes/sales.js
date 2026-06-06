import express from 'express';
import db from '../db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1. Get Sales History
router.get('/', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM sales WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY sale_date DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales history.' });
  }
});

// 2. Get Single Sale (Invoice details)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [sales] = await db.query('SELECT * FROM sales WHERE id = ?', [id]);
    if (sales.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const [items] = await db.query(
      `SELECT si.*, m.brand_name, m.category 
       FROM sale_items si 
       LEFT JOIN medicines m ON si.medicine_id = m.id 
       WHERE si.sale_id = ?`,
      [id]
    );

    res.json({
      sale: sales[0],
      items
    });
  } catch (error) {
    console.error('Fetch sale details error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details.' });
  }
});

// 3. Checkout/Create Bill
router.post('/', authenticateToken, async (req, res) => {
  const {
    customerId,
    customerName,
    customerMobile,
    customerAddress,
    customerVillage,
    items, // Array of { id, quantity, price }
    paymentMethod, // 'Cash', 'UPI', 'Credit'
    dueDate // Optional, for credit
  } = req.body;

  if (!customerName || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
    return res.status(400).json({ error: 'Customer name, products, and payment method are required.' });
  }

  try {
    // Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    // Start database transaction
    await db.query('START TRANSACTION');

    let finalCustomerId = customerId;

    // Auto-register customer if name is not 'Walk-in Customer' and customerId is not provided
    if (!finalCustomerId && customerName && customerName.toLowerCase() !== 'walk-in customer') {
      // Check if a customer with same name and mobile exists
      let matchQuery = 'SELECT id FROM customers WHERE name = ?';
      const matchParams = [customerName];
      if (customerMobile) {
        matchQuery += ' AND mobile = ?';
        matchParams.push(customerMobile);
      } else {
        matchQuery += ' AND (mobile IS NULL OR mobile = "")';
      }

      const [existingCust] = await db.query(matchQuery, matchParams);
      if (existingCust.length > 0) {
        finalCustomerId = existingCust[0].id;
      } else {
        // Automatically insert/register new customer
        const [newCustResult] = await db.query(
          'INSERT INTO customers (name, mobile, address, village) VALUES (?, ?, ?, ?)',
          [customerName, customerMobile || null, customerAddress || null, customerVillage || null]
        );
        finalCustomerId = newCustResult.insertId;
      }
    }

    let totalAmount = 0;
    const saleItemsToInsert = [];

    // Verify stock availability and collect details
    for (const item of items) {
      const [medRows] = await db.query('SELECT * FROM medicines WHERE id = ?', [item.id]);
      if (medRows.length === 0) {
        throw new Error(`Medicine not found in inventory.`);
      }

      const medicine = medRows[0];
      if (medicine.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}, Requested: ${item.quantity}`);
      }

      const itemTotal = parseFloat(medicine.selling_price) * parseInt(item.quantity);
      totalAmount += itemTotal;

      saleItemsToInsert.push({
        medicineId: medicine.id,
        medicineName: `${medicine.name} (${medicine.brand_name})`,
        quantity: item.quantity,
        unitPrice: medicine.selling_price,
        totalPrice: itemTotal,
        newQuantity: medicine.quantity - item.quantity,
        originalName: medicine.name
      });
    }

    // Insert Sale record using finalCustomerId
    const [saleResult] = await db.query(
      `INSERT INTO sales (invoice_number, customer_id, customer_name, customer_mobile, total_amount, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceNumber, finalCustomerId || null, customerName, customerMobile || null, totalAmount, paymentMethod]
    );

    const saleId = saleResult.insertId;

    // Deduct inventory stock and insert sales items
    for (const item of saleItemsToInsert) {
      // 1. Insert item line
      await db.query(
        `INSERT INTO sale_items (sale_id, medicine_id, medicine_name, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, item.medicineId, item.medicineName, item.quantity, item.unitPrice, item.totalPrice]
      );

      // 2. Update stock quantity and status
      let newStatus = 'In Stock';
      if (item.newQuantity === 0) newStatus = 'Out of Stock';
      else if (item.newQuantity < 10) newStatus = 'Low Stock';

      await db.query(
        'UPDATE medicines SET quantity = ?, stock_status = ? WHERE id = ?',
        [item.newQuantity, newStatus, item.medicineId]
      );

      // 3. Create notifications for low/out of stock
      if (item.newQuantity === 0) {
        await db.query(
          'INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)',
          ['Out of Stock', `${item.originalName} is now out of stock.`, item.medicineId]
        );
      } else if (item.newQuantity < 10) {
        await db.query(
          'INSERT INTO notifications (type, message, reference_id) VALUES (?, ?, ?)',
          ['Low Stock', `${item.originalName} is running low on stock (${item.newQuantity} units left).`, item.medicineId]
        );
      }
    }

    // Commit Transaction
    await db.query('COMMIT');

    res.status(201).json({
      message: 'Checkout completed successfully.',
      saleId,
      invoiceNumber,
      totalAmount
    });
  } catch (error) {
    // Rollback changes on failure
    await db.query('ROLLBACK');
    console.error('Checkout transaction failed:', error);
    res.status(500).json({ error: error.message || 'Checkout failed.' });
  }
});

export default router;
