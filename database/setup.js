import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function setup() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  console.log('Connecting to MySQL at:', connectionConfig.host, ':', connectionConfig.port);
  
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Successfully connected to MySQL.');
  } catch (error) {
    console.error('Error connecting to MySQL. Please check your credentials in .env:', error.message);
    process.exit(1);
  }

  try {
    // Read and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating database and tables...');
    await connection.query(schemaSql);
    console.log('Schema executed successfully.');

    // Switch to database
    await connection.query('USE village_medical_store;');

    // Insert Default Users
    const passwordHash = await bcrypt.hash('admin123', 10);
    const billingHash = await bcrypt.hash('billing123', 10);
    
    // a. Admin User
    const [admins] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (admins.length === 0) {
      await connection.query(
        'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
        ['admin', passwordHash, 'admin', 'Store Admin']
      );
      console.log('Created default admin user (username: admin, password: admin123).');
    } else {
      await connection.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [passwordHash, 'admin']
      );
      console.log('Reset admin user password to default (admin123).');
    }

    // b. Billing User
    const [billings] = await connection.query('SELECT * FROM users WHERE username = ?', ['billing']);
    if (billings.length === 0) {
      await connection.query(
        'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
        ['billing', billingHash, 'billing', 'Billing Counter Clerk']
      );
      console.log('Created default billing user (username: billing, password: billing123).');
    } else {
      await connection.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [billingHash, 'billing']
      );
      console.log('Reset billing user password to default (billing123).');
    }

    // Insert Default Medicines
    const [medsCount] = await connection.query('SELECT COUNT(*) as count FROM medicines');
    if (medsCount[0].count === 0) {
      console.log('Inserting seed medicines...');
      const medicines = [
        ['Paracetamol 650mg', 'Calpol', 'Tablets', 150, 10.50, 15.00, '2027-05-15', 'GlaxoSmithKline', 'In Stock', 'OTC pain reliever'],
        ['Amoxicillin 500mg', 'Mox', 'Capsules', 8, 45.00, 60.00, '2026-10-20', 'Sun Pharma', 'Low Stock', 'Antibiotic for bacterial infections'],
        ['Cetirizine 10mg', 'Okacet', 'Tablets', 200, 5.00, 8.50, '2027-03-12', 'Cipla', 'In Stock', 'Antihistamine for allergies'],
        ['Metformin 500mg', 'Glycomet', 'Tablets', 300, 15.00, 22.00, '2026-06-25', 'USV Private Ltd', 'In Stock', 'Oral diabetes medicine (Near expiry!)'],
        ['Ibuprofen 400mg', 'Brufen', 'Tablets', 0, 12.00, 18.00, '2027-01-30', 'Abbott', 'Out of Stock', 'NSAID pain reliever'],
        ['Cough Syrup 100ml', 'Benadryl', 'Syrup', 45, 80.00, 105.00, '2027-08-01', 'Johnson & Johnson', 'In Stock', 'Antitussive for cough relief'],
        ['Vitamin C 500mg', 'Limcee', 'Chewables', 400, 8.00, 12.00, '2028-02-15', 'Abbott', 'In Stock', 'Vitamin supplement'],
        ['Atorvastatin 10mg', 'Lipvas', 'Tablets', 12, 50.00, 72.00, '2027-04-10', 'Cipla', 'Low Stock', 'Cholesterol-lowering statin']
      ];
      
      for (const med of medicines) {
        await connection.query(
          `INSERT INTO medicines (name, brand_name, category, quantity, purchase_price, selling_price, expiry_date, manufacturer, stock_status, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          med
        );
      }
      console.log('Seed medicines inserted.');
    }

    // Insert Default Customers
    const [custsCount] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (custsCount[0].count === 0) {
      console.log('Inserting seed customers...');
      const customers = [
        ['Ram Singh', '9876543210', 'House No. 12, Main Street', 'Rampur', 'Regular customer, takes monthly diabetes medicines.'],
        ['Sita Devi', '8765432109', 'Near Shiv Temple', 'Lakhanpur', 'Elderly customer, pays via UPI.'],
        ['Vijay Kumar', '7654321098', 'Post Office Road', 'Rampur', 'Works at the agricultural market.'],
        ['Gopal Prasad', '6543210987', 'Farm Area Lane 3', 'Karanpur', 'Works at the grain market.']
      ];

      for (const cust of customers) {
        await connection.query(
          `INSERT INTO customers (name, mobile, address, village, notes) 
           VALUES (?, ?, ?, ?, ?)`,
          cust
        );
      }
      console.log('Seed customers inserted.');
    }

    // Insert Sales
    const [salesCount] = await connection.query('SELECT COUNT(*) as count FROM sales');
    if (salesCount[0].count === 0) {
      console.log('Inserting seed sales...');
      // Sale 1
      await connection.query(
        `INSERT INTO sales (invoice_number, customer_name, customer_mobile, total_amount, payment_method) 
         VALUES (?, ?, ?, ?, ?);`,
        ['INV-20260601-01', 'Ram Singh', '9876543210', 440.00, 'UPI']
      );
      const [sale1] = await connection.query('SELECT id FROM sales WHERE invoice_number = "INV-20260601-01"');
      const [glycomet] = await connection.query('SELECT id FROM medicines WHERE name LIKE "%Metformin%"');
      await connection.query(
        `INSERT INTO sale_items (sale_id, medicine_id, medicine_name, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?, ?);`,
        [sale1[0].id, glycomet[0].id, 'Metformin 500mg (Glycomet)', 20, 22.00, 440.00]
      );

      // Sale 2
      await connection.query(
        `INSERT INTO sales (invoice_number, customer_name, customer_mobile, total_amount, payment_method) 
         VALUES (?, ?, ?, ?, ?);`,
        ['INV-20260604-01', 'Sita Devi', '8765432109', 235.00, 'Card']
      );
      const [sale2] = await connection.query('SELECT id FROM sales WHERE invoice_number = "INV-20260604-01"');
      const [calpol] = await connection.query('SELECT id FROM medicines WHERE name LIKE "%Paracetamol%"');
      const [okacet] = await connection.query('SELECT id FROM medicines WHERE name LIKE "%Cetirizine%"');
      await connection.query(
        `INSERT INTO sale_items (sale_id, medicine_id, medicine_name, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?);`,
        [
          sale2[0].id, calpol[0].id, 'Paracetamol 650mg (Calpol)', 10, 15.00, 150.00,
          sale2[0].id, okacet[0].id, 'Cetirizine 10mg (Okacet)', 10, 8.50, 85.00
        ]
      );
      console.log('Seed sales and sale items inserted.');
    }

    // Insert Seed Notifications
    const [notifCount] = await connection.query('SELECT COUNT(*) as count FROM notifications');
    if (notifCount[0].count === 0) {
      console.log('Inserting notifications...');
      await connection.query(
        `INSERT INTO notifications (type, message, reference_id) 
         VALUES 
         ('Low Stock', 'Amoxicillin 500mg (Mox) is low in stock. Only 8 items remaining.', 2),
         ('Out of Stock', 'Ibuprofen 400mg (Brufen) is out of stock.', 5),
         ('Expiry Warning', 'Metformin 500mg (Glycomet) is expiring soon on 2026-06-25.', 4)`
      );
      console.log('Seed notifications inserted.');
    }

    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Error executing setup SQL / queries:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setup();
