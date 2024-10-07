const fs = require('fs');

// Function to validate NIK
const validateNIK = (nik) => {
  if (!/^\d{16}$/.test(nik)) {
    return 'NIK must be a 16-digit integer.';
  }
  return null; 
};

// Function to validate file
const validateFile = (file) => {
  if (!file) {
    return 'No file uploaded or file format is incorrect. Only PDF files are allowed.';
  }
  
  // Check file size limit (10 MB example)
  if (file.size > 10 * 1024 * 1024) {
    return 'File size exceeds the limit of 10 MB.';
  }

  return null; 
};

// Function to ensure uploads directory exists
const ensureUploadsDirectory = () => {
  const uploadDir = 'uploads/';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
};

// Export validation functions
module.exports = {
  validateNIK,
  validateFile,
  ensureUploadsDirectory,
};
