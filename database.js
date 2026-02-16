/**
 * Database Module - SQLite
 * Handles all database operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');

let db = null;

/**
 * Initialize database and create tables
 */
function initialize() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        return reject(err);
      }
      
      console.log('✅ Connected to SQLite database');

      // Create projects table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          approval_code TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          project_title TEXT NOT NULL,
          description TEXT,
          designer_name TEXT,
          artwork_images TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          modifications_remaining INTEGER DEFAULT 3,
          modification_history TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating projects table:', err);
          return reject(err);
        }

        console.log('✅ Database tables initialized');
        
        // Create indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_approval_code ON projects(approval_code)');
        db.run('CREATE INDEX IF NOT EXISTS idx_status ON projects(status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_customer_email ON projects(customer_email)');

        resolve();
      });
    });
  });
}

/**
 * Create new project
 */
function createProject(projectData) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO projects (
        approval_code, customer_name, customer_email, project_title,
        description, designer_name, artwork_images, status,
        modifications_remaining, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      projectData.approval_code,
      projectData.customer_name,
      projectData.customer_email,
      projectData.project_title,
      projectData.description,
      projectData.designer_name,
      projectData.artwork_images,
      projectData.status,
      projectData.modifications_remaining,
      projectData.created_at
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ id: this.lastID, ...projectData });
    });
  });
}

/**
 * Get project by approval code
 */
function getProjectByCode(code) {
  return new Promise((resolve, reject) => {
    // Try with dashes first, then without
    const codes = [
      code,
      code.replace(/-/g, ''),
      formatCodeWithDashes(code)
    ];

    const sql = `
      SELECT * FROM projects 
      WHERE approval_code IN (?, ?, ?)
      OR REPLACE(approval_code, '-', '') = ?
      LIMIT 1
    `;

    db.get(sql, [...codes, code.replace(/-/g, '')], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Get project by ID
 */
function getProjectById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Get all projects
 */
function getAllProjects() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM projects ORDER BY created_at DESC',
      [],
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows || []);
      }
    );
  });
}

/**
 * Update project status
 */
function updateProjectStatus(id, status) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE projects 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `;

    db.run(sql, [status, new Date().toISOString(), id], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ changes: this.changes });
    });
  });
}

/**
 * Add modification request
 */
function addModificationRequest(id, data) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE projects 
      SET modification_history = ?,
          modifications_remaining = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `;

    const params = [
      data.history,
      data.modificationsRemaining,
      data.status,
      new Date().toISOString(),
      id
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ changes: this.changes });
    });
  });
}

/**
 * Delete project
 */
function deleteProject(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ changes: this.changes });
    });
  });
}

/**
 * Close database connection
 */
function close() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

/**
 * Helper: Format code with dashes
 */
function formatCodeWithDashes(code) {
  const clean = code.replace(/-/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 2)}-${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  return code;
}

module.exports = {
  initialize,
  createProject,
  getProjectByCode,
  getProjectById,
  getAllProjects,
  updateProjectStatus,
  addModificationRequest,
  deleteProject,
  close
};
