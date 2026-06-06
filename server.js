import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create necessary upload directories if they don't exist
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/images')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created upload directory: ${dir}`);
  }
});

// Serve static upload folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import API Routers
import authRouter from './server/routes/auth.js';
import medicinesRouter from './server/routes/medicines.js';
import customersRouter from './server/routes/customers.js';
import salesRouter from './server/routes/sales.js';
import reportsRouter from './server/routes/reports.js';
import adminRouter from './server/routes/admin.js';

// Bind API Endpoints
app.use('/api/auth', authRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

// Serve built React frontend statically in production
const buildPath = path.join(__dirname, 'dist');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  // React Router SPA fallback
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found.' });
    }
  });
} else {
  // Developer placeholder during staging
  app.get('/', (req, res) => {
    res.send('Village Medical Store Backend running. Frontend is in development mode.');
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
