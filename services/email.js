/**
 * Email Service
 * Handles sending email notifications
 */

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send approval notification to customer
 * @param {Object} data - Email data
 */
async function sendApprovalNotification({ to, customerName, approvalCode, portalUrl, projectTitle }) {
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e42929; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
    .content { background: #fff; padding: 40px; border: 2px solid #e42929; border-top: none; border-radius: 0 0 8px 8px; }
    .code-box { background: #f9f9f9; border: 3px solid #e42929; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }
    .code { font-size: 32px; font-weight: bold; color: #e42929; font-family: 'Courier New', monospace; letter-spacing: 3px; }
    .button { display: inline-block; background: #e42929; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0; }
    .button:hover { background: #c72c2c; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; }
    .info-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #e42929; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 ThreadFueled</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Art Approval Portal</p>
    </div>
    
    <div class="content">
      <h2>Hi ${customerName},</h2>
      
      <p>Great news! Your custom design "<strong>${projectTitle}</strong>" is ready for review.</p>
      
      <p>Our design team has prepared your artwork and it's waiting for your approval.</p>
      
      <div class="code-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; font-weight: bold;">Your Approval Code</p>
        <div class="code">${approvalCode}</div>
      </div>
      
      <div style="text-align: center;">
        <a href="${portalUrl}" class="button">View Your Artwork</a>
      </div>
      
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;"><strong>What's Next?</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">
          1. Click the button above to access the portal<br>
          2. Enter your approval code<br>
          3. Review your artwork<br>
          4. Approve or request modifications
        </p>
      </div>
      
      <p>You have <strong>3 free modifications</strong> available. If you need any changes, just click "Request Modifications" and describe what you'd like adjusted.</p>
      
      <p>If you have any questions, feel free to reply to this email.</p>
      
      <p>Thanks,<br><strong>The ThreadFueled Team</strong></p>
    </div>
    
    <div class="footer">
      <p>ThreadFueled - Custom Design & Embroidery</p>
      <p style="font-size: 12px; color: #999;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'ThreadFueled <noreply@threadfueled.com>',
    to: to,
    subject: `🎨 Your Custom Design "${projectTitle}" is Ready for Review`,
    html: emailTemplate
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Send designer notification (when customer approves/requests mods)
 * @param {Object} data - Email data
 */
async function sendDesignerNotification({ to, projectTitle, approvalCode, action, customerName, modifications }) {
  const actionText = action === 'approved' ? 'approved' : 'requested modifications for';
  const actionColor = action === 'approved' ? '#10b981' : '#f59e0b';

  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${actionColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 40px; border: 2px solid ${actionColor}; border-top: none; border-radius: 0 0 8px 8px; }
    .code-box { background: #f9f9f9; padding: 15px; border-left: 4px solid ${actionColor}; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Customer ${action === 'approved' ? 'Approval' : 'Modification Request'}</h1>
    </div>
    
    <div class="content">
      <p><strong>${customerName}</strong> has ${actionText} the design.</p>
      
      <div class="code-box">
        <p><strong>Project:</strong> ${projectTitle}</p>
        <p><strong>Code:</strong> ${approvalCode}</p>
        ${modifications ? `<p><strong>Modifications Requested:</strong></p><p>${modifications}</p>` : ''}
      </div>
      
      ${action === 'approved' ? 
        '<p>✅ The design has been approved and is ready for production!</p>' :
        '<p>⚠️ Please review the modification requests and upload a revised design.</p>'
      }
      
      <p>Thanks,<br><strong>Art Portal System</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to || process.env.EMAIL_USER, // Send to admin email if designer email not set
    subject: `${action === 'approved' ? '✅' : '⚠️'} ${projectTitle} - ${customerName}`,
    html: emailTemplate
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Designer notification sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending designer notification:', error);
    throw error;
  }
}

/**
 * Test email configuration
 */
async function testEmail() {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}

module.exports = {
  sendApprovalNotification,
  sendDesignerNotification,
  testEmail
};
