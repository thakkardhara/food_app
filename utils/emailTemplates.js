/**
 * Professional Email Templates for Food App
 * All emails use a consistent, modern design with proper branding
 */

const getEmailTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>92 Eats</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .email-header h1 {
          color: #ffffff;
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .email-header p {
          color: #f0f0f0;
          font-size: 14px;
          margin-top: 8px;
        }
        .email-body {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .email-body h2 {
          color: #667eea;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .email-body p {
          font-size: 16px;
          margin-bottom: 15px;
          color: #555555;
        }
        .otp-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          font-size: 36px;
          font-weight: 700;
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
          letter-spacing: 8px;
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        .info-box {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          font-size: 14px;
          color: #666666;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }
        .email-footer p {
          font-size: 13px;
          color: #888888;
          margin: 5px 0;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          display: inline-block;
          margin: 0 8px;
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
        }
        .divider {
          height: 1px;
          background-color: #e0e0e0;
          margin: 20px 0;
        }
        @media only screen and (max-width: 600px) {
          .email-body {
            padding: 30px 20px;
          }
          .otp-box {
            font-size: 28px;
            letter-spacing: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🍔 92 Eats</h1>
          <p>Your Favorite Food Delivery Service</p>
        </div>
        ${content}
        <div class="email-footer">
          <p><strong>92 Eats</strong> - Delicious food delivered to your doorstep</p>
          <div class="divider"></div>
          <p>📧 Email: support@92eats.com | 📞 Phone: +1 (555) 092-3287</p>
          <p style="margin-top: 15px; font-size: 12px; color: #aaaaaa;">
            This is an automated email. Please do not reply to this message.
          </p>
          <p style="font-size: 12px; color: #aaaaaa;">
            © ${new Date().getFullYear()} 92 Eats. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * OTP Email Template for User Registration
 */
const getRegistrationOTPEmail = (username, otp) => {
  const content = `
    <div class="email-body">
      <h2>Welcome to 92 Eats! 🎉</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>Thank you for registering with 92 Eats! We're excited to have you on board.</p>
      <p>To complete your registration and verify your email address, please use the OTP code below:</p>
      
      <div class="otp-box">${otp}</div>
      
      <div class="info-box">
        <p><strong>⏰ Important:</strong></p>
        <p>• This OTP is valid for <strong>10 minutes</strong></p>
        <p>• Do not share this code with anyone</p>
        <p>• If you didn't request this, please ignore this email</p>
      </div>
      
      <p>Once verified, you'll be able to:</p>
      <p>✅ Browse restaurants and menus<br>
         ✅ Place orders for delivery or takeaway<br>
         ✅ Track your orders in real-time<br>
         ✅ Save your favorite restaurants</p>
      
      <p style="margin-top: 25px;">Happy ordering! 🍕🍔🍜</p>
    </div>
  `;
  return getEmailTemplate(content);
};

/**
 * OTP Email Template for Password Reset
 */
const getPasswordResetOTPEmail = (otp) => {
  const content = `
    <div class="email-body">
      <h2>Password Reset Request 🔐</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your 92 Eats account.</p>
      <p>Use the OTP code below to reset your password:</p>
      
      <div class="otp-box">${otp}</div>
      
      <div class="info-box">
        <p><strong>⏰ Security Notice:</strong></p>
        <p>• This OTP is valid for <strong>15 minutes</strong></p>
        <p>• Never share this code with anyone</p>
        <p>• Our team will never ask for your OTP</p>
      </div>
      
      <p><strong>Didn't request a password reset?</strong></p>
      <p>If you didn't make this request, please ignore this email. Your password will remain unchanged, and your account is secure.</p>
      
      <p style="margin-top: 25px;">Stay safe! 🛡️</p>
    </div>
  `;
  return getEmailTemplate(content);
};

/**
 * Welcome Email (After OTP Verification)
 */
const getWelcomeEmail = (username) => {
  const content = `
    <div class="email-body">
      <h2>Welcome to 92 Eats Family! 🎊</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>Your email has been successfully verified! Your account is now active and ready to use.</p>
      
      <div class="info-box">
        <p><strong>🚀 Get Started:</strong></p>
        <p>• Explore restaurants near you</p>
        <p>• Check out exclusive deals and offers</p>
        <p>• Order your favorite meals</p>
        <p>• Enjoy fast delivery or convenient takeaway</p>
      </div>
      
      <p>We're committed to bringing you the best food delivery experience. If you have any questions or need assistance, our support team is always here to help!</p>
      
      <p style="margin-top: 25px;">Happy eating! 🍽️</p>
    </div>
  `;
  return getEmailTemplate(content);
};

/**
 * Password Changed Confirmation Email
 */
const getPasswordChangedEmail = (username) => {
  const content = `
    <div class="email-body">
      <h2>Password Successfully Changed ✅</h2>
      <p>Hi ${username ? `<strong>${username}</strong>` : 'there'},</p>
      <p>This email confirms that your password has been successfully changed.</p>
      
      <div class="info-box">
        <p><strong>🔒 Security Tips:</strong></p>
        <p>• Use a strong, unique password</p>
        <p>• Never share your password with anyone</p>
        <p>• Enable two-factor authentication if available</p>
        <p>• Change your password regularly</p>
      </div>
      
      <p><strong>Didn't make this change?</strong></p>
      <p>If you didn't change your password, please contact our support team immediately at <strong>support@92eats.com</strong></p>
      
      <p style="margin-top: 25px;">Your security is our priority! 🛡️</p>
    </div>
  `;
  return getEmailTemplate(content);
};

module.exports = {
  getRegistrationOTPEmail,
  getPasswordResetOTPEmail,
  getWelcomeEmail,
  getPasswordChangedEmail
};
