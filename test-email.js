/**
 * Email Configuration Test Script
 * Run this to verify your Gmail credentials and email sending functionality
 */

require('dotenv').config();
const sendMail = require('./utils/sendMail');
const { getRegistrationOTPEmail, getPasswordResetOTPEmail } = require('./utils/emailTemplates');

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');
  console.log('');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASS not set in .env file');
    process.exit(1);
  }
  
  // Test email address (change this to your test email)
  const testEmail = "kiyef74452@roastic.com" // Send to yourself for testing
  
  try {
    console.log('📨 Sending test registration email...');
    await sendMail({
      to: testEmail,
      subject: 'Test - 92 Eats Registration Email',
      text: 'This is a test registration email',
      html: getRegistrationOTPEmail('Test User', '123456')
    });
    console.log('✅ Registration email sent successfully!\n');
    
    console.log('📨 Sending test password reset email...');
    await sendMail({
      to: testEmail,
      subject: 'Test - 92 Eats Password Reset Email',
      text: 'This is a test password reset email',
      html: getPasswordResetOTPEmail('654321')
    });
    console.log('✅ Password reset email sent successfully!\n');
    
    console.log('🎉 All email tests passed!');
    console.log(`📬 Check your inbox at: ${testEmail}`);
    console.log('');
    console.log('✨ Email configuration is working correctly!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('1. Invalid Gmail credentials');
    console.error('2. 2-Step Verification not enabled on Gmail');
    console.error('3. App Password not generated correctly');
    console.error('4. Less secure app access disabled (use App Password instead)');
    console.error('');
    console.error('Solution:');
    console.error('1. Go to: https://myaccount.google.com/security');
    console.error('2. Enable 2-Step Verification');
    console.error('3. Generate App Password: https://myaccount.google.com/apppasswords');
    console.error('4. Use the 16-character App Password in EMAIL_PASS');
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration();
