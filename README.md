# 🎨 ThreadFueled Art Portal - Backend API

Complete production-ready backend for the ThreadFueled Art Approval Portal system.

## 📦 **What This Backend Does**

✅ **File Uploads** - Handles multi-image uploads from admin portal  
✅ **Cloud Storage** - Stores images on Cloudinary CDN  
✅ **Database** - SQLite database for project data  
✅ **Email Notifications** - Sends beautiful HTML emails to customers  
✅ **REST API** - Provides endpoints for both portals  
✅ **Project Management** - Full CRUD operations for projects  

---

## 🚀 **Quick Start (5 Minutes)**

### **1. Install Dependencies**

```bash
cd /home/user/threadfueled-backend
npm install
```

### **2. Configure Environment**

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

**Edit `.env` file:**

```env
# Server
PORT=3001

# Your Shopify Store
SHOPIFY_STORE_URL=your-store.myshopify.com
CUSTOMER_PORTAL_URL=https://your-store.myshopify.com/pages/art-approval

# Cloudinary (Sign up free at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=ThreadFueled <designs@threadfueled.com>

# CORS (Your Shopify domain)
ALLOWED_ORIGINS=https://your-store.myshopify.com
```

### **3. Start the Server**

```bash
npm start
```

You should see:

```
═══════════════════════════════════════════════════════
🎨 ThreadFueled Art Portal Backend
═══════════════════════════════════════════════════════
✅ Server running on port 3001
✅ Environment: development
✅ Database: database.sqlite
✅ CORS: https://your-store.myshopify.com
═══════════════════════════════════════════════════════
```

---

## 🔧 **Setup Services**

### **Cloudinary Setup (Free - 5 min)**

1. Go to https://cloudinary.com/users/register/free
2. Sign up for free account
3. Get your **Cloud Name**, **API Key**, and **API Secret**
4. Add to `.env` file

### **Gmail Email Setup (Free - 5 min)**

1. Enable 2-factor authentication on your Gmail account
2. Go to https://myaccount.google.com/apppasswords
3. Create an **App Password** for "Mail"
4. Use this password in `.env` (not your regular password!)

**Example:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=yourname@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # The app password
EMAIL_FROM=ThreadFueled <designs@threadfueled.com>
```

---

## 📡 **API Endpoints**

### **Health Check**
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-02-15T..."
}
```

---

### **Admin Endpoints**

#### **Upload Project**
```
POST /api/admin/upload
Content-Type: multipart/form-data
```

**Body (FormData):**
```
customerName: John Smith
customerEmail: john@email.com
projectTitle: Custom Logo Design
approvalCode: TF-1234-5678
description: Custom embroidery design
files[]: [file1.jpg, file2.png, ...]
```

**Response:**
```json
{
  "success": true,
  "message": "Project uploaded successfully",
  "projectId": 1,
  "approvalCode": "TF-1234-5678",
  "imagesUploaded": 3
}
```

#### **Get All Projects**
```
GET /api/admin/projects
```

**Response:**
```json
{
  "success": true,
  "projects": [...],
  "count": 5
}
```

#### **Get Project by ID**
```
GET /api/admin/projects/:id
```

#### **Delete Project**
```
DELETE /api/admin/projects/:id
```

---

### **Customer Endpoints**

#### **Get Project by Code**
```
GET /api/customer/project/:code
```

**Example:**
```
GET /api/customer/project/TF12345678
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": 1,
    "code": "TF-1234-5678",
    "customer": "John Smith",
    "designer": "ThreadFueled Designer",
    "title": "Custom Logo",
    "description": "...",
    "artwork": "https://res.cloudinary.com/...",
    "artworkImages": [...],
    "status": "pending",
    "modificationsLeft": 3,
    "createdDate": "2024-02-15T...",
    "modificationHistory": []
  }
}
```

#### **Approve Project**
```
POST /api/customer/approve/:code
```

**Response:**
```json
{
  "success": true,
  "message": "Artwork approved successfully"
}
```

#### **Request Modifications**
```
POST /api/customer/modify/:code
Content-Type: application/json

{
  "modifications": "Please make the logo bigger and change color to blue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Modification request submitted",
  "modificationsRemaining": 2
}
```

---

## 🔌 **Connect to Shopify Portals**

### **Update Admin Portal**

In `WORKING-admin-portal.liquid`, replace the form submit with:

```javascript
document.getElementById('tfaForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (uploadedFiles.length === 0) {
    alert('Please upload at least one image');
    return;
  }

  const submitBtn = this.querySelector('.tfa-btn-primary');
  submitBtn.innerHTML = '⏳ Uploading...';
  submitBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('customerName', document.getElementById('tfaCustomerName').value);
    formData.append('customerEmail', document.getElementById('tfaCustomerEmail').value);
    formData.append('projectTitle', document.getElementById('tfaProjectTitle').value);
    formData.append('approvalCode', document.getElementById('tfaApprovalCode').value);
    formData.append('description', document.getElementById('tfaDescription').value);

    uploadedFiles.forEach(file => formData.append('files[]', file));

    // Send to backend
    const response = await fetch('https://your-backend-url.com/api/admin/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('tfaAlert').textContent = `✓ Project uploaded! Code: ${result.approvalCode}`;
      document.getElementById('tfaAlert').classList.add('show');
      
      this.reset();
      uploadedFiles = [];
      document.getElementById('tfaPreviewGrid').innerHTML = '';
      tfaGenerateCode();
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    alert('Upload failed: ' + error.message);
  } finally {
    submitBtn.innerHTML = '📤 Upload & Notify';
    submitBtn.disabled = false;
  }
});
```

### **Update Customer Portal**

In `WORKING-customer-portal.liquid`, replace the login function:

```javascript
window.tfpLogin = async function() {
  const code = input.value.toUpperCase().replace(/-/g, '');
  
  const btn = document.querySelector('.tfp-btn');
  btn.textContent = 'Loading...';
  btn.disabled = true;

  try {
    const response = await fetch(`https://your-backend-url.com/api/customer/project/${code}`);
    const data = await response.json();

    if (data.success && data.project) {
      currentProject = data.project;
      
      document.getElementById('tfpError').style.display = 'none';
      document.getElementById('tfpLogin').style.display = 'none';
      document.getElementById('tfpDash').classList.add('active');
      
      // Load data
      document.getElementById('tfpCode').textContent = data.project.code;
      document.getElementById('tfpCustomer').textContent = data.project.customer;
      document.getElementById('tfpDesigner').textContent = data.project.designer;
      document.getElementById('tfpDate').textContent = new Date(data.project.createdDate).toLocaleDateString();
      document.getElementById('tfpDescription').textContent = data.project.description;
      document.getElementById('tfpMods').textContent = data.project.modificationsLeft;
      document.getElementById('tfpArtImg').src = data.project.artwork;
    } else {
      throw new Error('Project not found');
    }
  } catch (error) {
    document.getElementById('tfpError').style.display = 'block';
  } finally {
    btn.textContent = 'ACCESS ARTWORK';
    btn.disabled = false;
  }
};
```

---

## 🚀 **Deployment**

### **Option 1: Heroku (Free)**

```bash
# Install Heroku CLI
# Then:
heroku create threadfueled-backend
git push heroku main
heroku config:set CLOUDINARY_CLOUD_NAME=your_name
heroku config:set CLOUDINARY_API_KEY=your_key
# ... set all env vars
```

### **Option 2: Railway (Easy)**

1. Go to https://railway.app
2. Connect GitHub repo
3. Add environment variables
4. Deploy!

### **Option 3: Your Own Server**

```bash
# On your server:
git clone your-repo
cd threadfueled-backend
npm install
npm start

# Use PM2 for production:
npm install -g pm2
pm2 start server.js --name threadfueled-backend
pm2 startup
pm2 save
```

---

## 📊 **File Structure**

```
threadfueled-backend/
├── server.js              # Main server file
├── database.js            # Database operations
├── services/
│   ├── cloudinary.js      # Image upload service
│   └── email.js           # Email notification service
├── package.json           # Dependencies
├── .env                   # Configuration (DO NOT COMMIT!)
├── .env.example           # Example configuration
└── README.md              # This file
```

---

## 🔐 **Security**

✅ **CORS** - Only allows requests from your Shopify domain  
✅ **File Upload Limits** - Max 10MB per file, max 10 files  
✅ **File Type Validation** - Only images allowed  
✅ **Environment Variables** - Secrets stored in `.env`  
✅ **Input Validation** - All inputs validated  

---

## 🐛 **Troubleshooting**

### **Email not sending?**
- Check Gmail app password is correct
- Make sure 2FA is enabled on Gmail account
- Try test: `npm run test-email`

### **Cloudinary upload failing?**
- Verify cloud name, API key, and secret
- Check file size (must be under 10MB)
- Verify image format (JPG, PNG, GIF, WebP)

### **Database errors?**
- Make sure `database.sqlite` file is writable
- Check file permissions
- Delete `database.sqlite` to reset (will lose data!)

### **CORS errors from Shopify?**
- Update `ALLOWED_ORIGINS` in `.env`
- Include full Shopify URL with https://
- Restart server after changing `.env`

---

## 📞 **Support**

**Test the backend:**
```bash
# Health check
curl http://localhost:3001/api/health

# Test upload (replace with real values)
curl -X POST http://localhost:3001/api/admin/upload \
  -F "customerName=Test Customer" \
  -F "customerEmail=test@email.com" \
  -F "projectTitle=Test Project" \
  -F "approvalCode=TF-TEST-1234" \
  -F "description=Test description" \
  -F "files[]=@/path/to/image.jpg"
```

---

## ✅ **Production Checklist**

- [ ] Set all environment variables in `.env`
- [ ] Test email sending
- [ ] Test file uploads to Cloudinary
- [ ] Test database operations
- [ ] Update Shopify portal files with backend URL
- [ ] Deploy backend to production server
- [ ] Update CORS origins
- [ ] Test full workflow (upload → email → customer login)
- [ ] Set up monitoring/logs
- [ ] Configure SSL/HTTPS

---

**Backend built and ready!** 🎉

All files are in `/home/user/threadfueled-backend/`
