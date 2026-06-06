import express from 'express';
import db from '../db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireStaffOrAdmin);

// 1. Dashboard Statistics Summary
router.get('/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // a. Today's sales count and amount
    const [todaySales] = await db.query('SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM sales WHERE DATE(sale_date) = ?', [today]);
    const salesTodayCount = todaySales[0].count || 0;
    const revenueToday = parseFloat(todaySales[0].revenue || 0);

    // b. Monthly Revenue
    const [monthlySales] = await db.query('SELECT SUM(total_amount) as revenue FROM sales WHERE sale_date LIKE ?', [`${currentMonth}%`]);
    const revenueMonthly = parseFloat(monthlySales[0].revenue || 0);

    // c. Low-stock medicines list (qty < 10)
    const [lowStockMedicines] = await db.query('SELECT name, brand_name, category, quantity, stock_status FROM medicines WHERE quantity < 10 ORDER BY quantity ASC LIMIT 10');

    // d. Recent Sales (last 5 generated invoices/bills)
    const [recentSales] = await db.query('SELECT invoice_number, customer_name, total_amount, payment_method, sale_date FROM sales ORDER BY sale_date DESC LIMIT 5');

    // e. Top 5 selling medicines
    const [topMedicines] = await db.query(
      `SELECT medicine_name, SUM(quantity) as sold_qty, SUM(total_price) as total_revenue
       FROM sale_items 
       GROUP BY medicine_name 
       ORDER BY sold_qty DESC 
       LIMIT 5`
    );

    // f. Active Notifications Feed (Limit 15, unread first)
    const [notifFeed] = await db.query(
      'SELECT * FROM notifications ORDER BY is_read ASC, created_at DESC LIMIT 15'
    );

    res.json({
      revenueToday,
      revenueMonthly,
      salesTodayCount,
      lowStockMedicines,
      recentSales,
      topMedicines,
      notifications: notifFeed
    });
  } catch (error) {
    console.error('Fetch dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard intelligence.' });
  }
});

// 2. Fetch Notifications (Mark as read, delete, clear)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.delete('/notifications/clear', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE is_read = TRUE');
    res.json({ message: 'Cleared read notifications.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

// 3. Compile Reports
router.get('/sales-report', authenticateToken, async (req, res) => {
  const { type, date, month, year } = req.query;
  try {
    let salesQuery = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (type === 'daily') {
      const filterDate = date || new Date().toISOString().split('T')[0];
      salesQuery += ' AND DATE(sale_date) = ?';
      params.push(filterDate);
    } else if (type === 'weekly') {
      salesQuery += ' AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (type === 'monthly') {
      const filterMonth = month || new Date().toISOString().slice(5, 7);
      const filterYear = year || new Date().getFullYear().toString();
      salesQuery += ' AND YEAR(sale_date) = ? AND MONTH(sale_date) = ?';
      params.push(filterYear, filterMonth);
    } else if (type === 'yearly') {
      const filterYear = year || new Date().getFullYear().toString();
      salesQuery += ' AND YEAR(sale_date) = ?';
      params.push(filterYear);
    }

    salesQuery += ' ORDER BY sale_date DESC';
    const [sales] = await db.query(salesQuery, params);

    // Payment method breakdown
    let paymentQuery = `
      SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total 
      FROM sales 
      WHERE 1=1
    `;
    const paymentParams = [];
    if (type === 'daily') {
      paymentQuery += ' AND DATE(sale_date) = ?';
      paymentParams.push(date || new Date().toISOString().split('T')[0]);
    } else if (type === 'weekly') {
      paymentQuery += ' AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (type === 'monthly') {
      paymentQuery += ' AND YEAR(sale_date) = ? AND MONTH(sale_date) = ?';
      paymentParams.push(year || new Date().getFullYear().toString(), month || new Date().toISOString().slice(5, 7));
    } else if (type === 'yearly') {
      paymentQuery += ' AND YEAR(sale_date) = ?';
      paymentParams.push(year || new Date().getFullYear().toString());
    }
    paymentQuery += ' GROUP BY payment_method';
    const [paymentBreakdown] = await db.query(paymentQuery, paymentParams);

    // Medicine-wise sales history
    let medQuery = `
      SELECT si.medicine_name, SUM(si.quantity) as total_qty, SUM(si.total_price) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE 1=1
    `;
    const medParams = [];
    if (type === 'daily') {
      medQuery += ' AND DATE(s.sale_date) = ?';
      medParams.push(date || new Date().toISOString().split('T')[0]);
    } else if (type === 'weekly') {
      medQuery += ' AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (type === 'monthly') {
      medQuery += ' AND YEAR(s.sale_date) = ? AND MONTH(s.sale_date) = ?';
      medParams.push(year || new Date().getFullYear().toString(), month || new Date().toISOString().slice(5, 7));
    } else if (type === 'yearly') {
      medQuery += ' AND YEAR(s.sale_date) = ?';
      medParams.push(year || new Date().getFullYear().toString());
    }
    medQuery += ' GROUP BY si.medicine_name ORDER BY total_qty DESC';
    const [medicineSales] = await db.query(medQuery, medParams);

    res.json({
      sales,
      paymentBreakdown,
      medicineSales
    });
  } catch (error) {
    console.error('Fetch sales report error:', error);
    res.status(500).json({ error: 'Failed to load sales report.' });
  }
});

router.get('/stock-report', authenticateToken, async (req, res) => {
  try {
    const [lowStock] = await db.query('SELECT name, brand_name, category, quantity, stock_status FROM medicines WHERE quantity < 10 ORDER BY quantity ASC');
    const [expiring] = await db.query('SELECT name, brand_name, expiry_date, quantity FROM medicines WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY) ORDER BY expiry_date ASC');
    res.json({
      lowStock,
      expiring
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stock reports.' });
  }
});

export default router;
