/**
 * ThreadFueled Art Approval Portal - Backend Server
 * Complete production-ready API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Import modules
const db = require('./database');
const cloudinaryService = require('./services/cloudinary');
const emailService = require('./services/email');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'));
    }
  }
});

// ==================== ROUTES ====================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'ThreadFueled Art Portal API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * POST /api/admin/upload
 * Upload new artwork project
 */
app.post('/api/admin/upload', upload.array('files[]', 10), async (req, res) => {
  console.log('📤 Admin upload request received');
  console.log('Body:', req.body);
  console.log('Files:', req.files?.length);

  try {
    const { customerName, customerEmail, projectTitle, approvalCode, description } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !projectTitle || !approvalCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images uploaded'
      });
    }

    // Upload images to Cloudinary
    console.log('☁️ Uploading images to Cloudinary...');
    const uploadedImages = await Promise.all(
      req.files.map(file => cloudinaryService.uploadImage(file.buffer, {
        folder: 'threadfueled-projects',
        public_id: `${approvalCode.replace(/-/g, '_')}_${Date.now()}`
      }))
    );

    console.log('✅ Images uploaded:', uploadedImages.length);

    // Create project in database
    const projectData = {
      approval_code: approvalCode,
      customer_name: customerName,
      customer_email: customerEmail,
      project_title: projectTitle,
      description: description || '',
      designer_name: 'ThreadFueled Designer', // You can make this dynamic
      artwork_images: JSON.stringify(uploadedImages.map(img => ({
        url: img.secure_url,
        public_id: img.public_id,
        width: img.width,
        height: img.height
      }))),
      status: 'pending',
      modifications_remaining: 3,
      created_at: new Date().toISOString()
    };

    const project = await db.createProject(projectData);
    console.log('✅ Project created in database:', project.id);

    // Send email notification to customer
    try {
      const portalUrl = `${process.env.CUSTOMER_PORTAL_URL}`;
      await emailService.sendApprovalNotification({
        to: customerEmail,
        customerName,
        approvalCode,
        portalUrl,
        projectTitle
      });
      console.log('✅ Email sent to customer');
    } catch (emailError) {
      console.error('⚠️ Email failed (continuing anyway):', emailError.message);
      // Don't fail the whole request if email fails
    }

    res.json({
      success: true,
      message: 'Project uploaded successfully',
      projectId: project.id,
      approvalCode: approvalCode,
      imagesUploaded: uploadedImages.length
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/projects
 * Get all projects (for admin dashboard)
 */
app.get('/api/admin/projects', async (req, res) => {
  try {
    const projects = await db.getAllProjects();
    res.json({
      success: true,
      projects: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/projects/:id
 * Get specific project by ID
 */
app.get('/api/admin/projects/:id', async (req, res) => {
  try {
    const project = await db.getProjectById(req.params.id);
    
    if (project) {
      res.json({
        success: true,
        project: project
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/projects/:id
 * Delete a project
 */
app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const project = await db.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Delete images from Cloudinary
    const images = JSON.parse(project.artwork_images);
    await Promise.all(
      images.map(img => cloudinaryService.deleteImage(img.public_id))
    );

    // Delete from database
    await db.deleteProject(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CUSTOMER ENDPOINTS ====================

/**
 * GET /api/customer/project/:code
 * Get project by approval code (for customer portal)
 */
app.get('/api/customer/project/:code', async (req, res) => {
  console.log('🔍 Customer looking up code:', req.params.code);

  try {
    const code = req.params.code.toUpperCase().replace(/-/g, '');
    const project = await db.getProjectByCode(code);

    if (project) {
      console.log('✅ Project found:', project.approval_code);
      
      // Parse artwork images
      const artworkImages = JSON.parse(project.artwork_images);

      res.json({
        success: true,
        project: {
          id: project.id,
          code: project.approval_code,
          customer: project.customer_name,
          designer: project.designer_name,
          title: project.project_title,
          description: project.description,
          artwork: artworkImages[0]?.url || '', // First image URL
          artworkImages: artworkImages, // All images
          status: project.status,
          modificationsLeft: project.modifications_remaining,
          createdDate: project.created_at,
          modificationHistory: project.modification_history ? JSON.parse(project.modification_history) : []
        }
      });
    } else {
      console.log('❌ Project not found');
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/customer/approve/:code
 * Approve artwork
 */
app.post('/api/customer/approve/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().replace(/-/g, '');
    const project = await db.getProjectByCode(code);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Update status
    await db.updateProjectStatus(project.id, 'approved');

    // Send notification to admin/designer
    // TODO: Add admin notification email

    res.json({
      success: true,
      message: 'Artwork approved successfully'
    });
  } catch (error) {
    console.error('❌ Error approving project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/customer/modify/:code
 * Request modifications
 */
app.post('/api/customer/modify/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().replace(/-/g, '');
    const { modifications } = req.body;

    if (!modifications || !modifications.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Modification details required'
      });
    }

    const project = await db.getProjectByCode(code);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.modifications_remaining <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No modifications remaining'
      });
    }

    // Add to modification history
    const history = project.modification_history ? JSON.parse(project.modification_history) : [];
    history.push({
      number: history.length + 1,
      date: new Date().toISOString(),
      content: modifications
    });

    // Update project
    await db.addModificationRequest(project.id, {
      history: JSON.stringify(history),
      modificationsRemaining: project.modifications_remaining - 1,
      status: 'in-review'
    });

    // Send notification to designer
    // TODO: Add designer notification email

    res.json({
      success: true,
      message: 'Modification request submitted',
      modificationsRemaining: project.modifications_remaining - 1
    });
  } catch (error) {
    console.error('❌ Error submitting modifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ==================== START SERVER ====================

// Initialize database
db.initialize().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎨 ThreadFueled Art Portal Backend');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Database: ${process.env.DATABASE_PATH || 'database.sqlite'}`);
    console.log(`✅ CORS: ${process.env.ALLOWED_ORIGINS || 'All origins'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 Admin upload: http://localhost:${PORT}/api/admin/upload`);
    console.log(`📍 Customer lookup: http://localhost:${PORT}/api/customer/project/:code`);
    console.log('═══════════════════════════════════════════════════════');
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  db.close();
  process.exit(0);
});
