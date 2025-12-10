const path = require('path');
const multer = require('multer');
const fs = require('fs');




// Email validation: accept all valid email formats
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Backward compatibility alias (deprecated)
function isValidGmail(email) {
    return isValidEmail(email);
}

// Phone validation: only 10 digits, no chars allowed
function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

// Password validation: min 6 chars, at least 1 special char, 1 digit, 1 letter
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    return passwordRegex.test(password);
}

function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}


module.exports = {
    isValidEmail,
    isValidGmail, // deprecated, use isValidEmail
    isValidPhone,
    isValidPassword,
    generateOTP
  
    
};