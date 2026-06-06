import express from 'express';
import multer from 'multer';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit for sql dump

// Helper to escape values for SQL dump
function escapeSQLValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (val instanceof Date) {
    return `'${val.toISOString().split('T')[0]}'`;
  }
  // Escape single quotes and backslashes
  const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

// 1. BACKUP DATABASE: Generate SQL Dump in Pure JS
router.get('/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const databaseName = 'village_medical_store';
    let dump = `-- Village Medical Store Management System SQL Dump
-- Generated: ${new Date().toISOString()}
-- Database: ${databaseName}
-- ------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const tables = [
      'users',
      'medicines',
      'customers',
      'patients',
      'regular_credit',
      'village_borrowers',
      'visitors',
      'sales',
      'sale_items',
      'notifications'
    ];

    for (const table of tables) {
      dump += `--\n-- Table structure for table \`${table}\`\n--\n\n`;
      
      // Get Create Table Statement
      const [createRows] = await db.query(`SHOW CREATE TABLE \`${table}\``);
      if (createRows.length > 0) {
        const createTableSql = createRows[0]['Create Table'];
        dump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        dump += `${createTableSql};\n\n`;
      }

      // Get Table Data
      dump += `--\n-- Dumping data for table \`${table}\`\n--\n\n`;
      const [dataRows] = await db.query(`SELECT * FROM \`${table}\``);
      if (dataRows.length > 0) {
        // Collect column names
        const columns = Object.keys(dataRows[0]).map(c => `\`${c}\``).join(', ');
        dump += `INSERT INTO \`${table}\` (${columns}) VALUES\n`;
        
        const valueStrings = dataRows.map(row => {
          const rowVals = Object.values(row).map(escapeSQLValue).join(', ');
          return `(${rowVals})`;
        });
        
        dump += valueStrings.join(',\n') + ';\n\n';
      }
    }

    dump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    // Send file
    const filename = `backup_village_medical_store_${Date.now()}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(dump);
  } catch (error) {
    console.error('Backup database error:', error);
    res.status(500).json({ error: 'Failed to generate database backup.' });
  }
});

// 2. RESTORE DATABASE: Execute SQL Dump File
router.post('/restore', authenticateToken, requireAdmin, upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a SQL backup file.' });
  }

  const sqlContent = req.file.buffer.toString('utf8');

  try {
    // Start Transaction or Execute multiple statements directly
    // mysql2 supports multiple statements if configured.
    console.log('Restoring database using uploaded SQL backup...');
    
    // We execute queries directly using a custom connection with multipleStatements: true
    // db.js exports a pool, we can get a connection from the pool.
    const connection = await db.getConnection();
    try {
      await connection.query('USE village_medical_store;');
      await connection.query(sqlContent);
      console.log('Database restore completed successfully.');
      res.json({ message: 'Database restored successfully from backup.' });
    } catch (queryErr) {
      throw queryErr;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Restore database error:', error);
    res.status(500).json({ error: 'Failed to restore database from backup: ' + error.message });
  }
});

export default router;
