-- Schema for Ganga Medico Store Management System

DROP DATABASE IF EXISTS village_medical_store;
CREATE DATABASE village_medical_store;
USE village_medical_store;

-- 1. Admin/Staff Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff', -- 'admin' or 'staff'
  full_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Medicine Inventory Table
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  brand_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INT DEFAULT 0,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  stock_status VARCHAR(20) DEFAULT 'In Stock', -- 'In Stock', 'Low Stock', 'Out of Stock'
  image_url VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  village VARCHAR(100) DEFAULT NULL,
  photo_url VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sales Table (Invoices)
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_id INT DEFAULT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_mobile VARCHAR(15) DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'Cash', -- 'Cash', 'UPI', 'Card'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- 5. Sale Items Table (Line Items)
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  medicine_id INT DEFAULT NULL,
  medicine_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'Low Stock', 'Out of Stock', 'Expiry Warning'
  message TEXT NOT NULL,
  reference_id INT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
