const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const {
  validateNIK,
  validateFile,
  ensureUploadsDirectory,
} = require('./validation');
const cont = express.Router();

// Ensure 'uploads' folder exists
ensureUploadsDirectory();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Upload folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Add timestamp to the filename
  }
});

// Multer file filter to accept only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Only PDF files are allowed'), false); // Reject the file
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter // Apply file filter
});

// File upload route
cont.post('/', upload.single('pdf'), (req, res) => {
  const file = req.file;
  const nik = req.body.nik;
  const visual = req.body.visual; // New parameter for visual option

  // Validate NIK
  const nikError = validateNIK(nik);
  if (nikError) {
    return res.status(400).send(nikError);
  }

  // Validate file
  const fileError = validateFile(file);
  if (fileError) {
    return res.status(400).send(fileError);
  }

  console.log('Uploaded file info:', file);
  console.log('NIK:', nik);
  console.log('Visibility option:', visual); // Log the visibility option

  // Simulate signing process (replace with actual API call later)
  const signedFileName = `signed-${file.filename}`;
  const signedFilePath = path.join('uploads', signedFileName);

  // Simulate writing a signed PDF (for now just copy the file)
  fs.copyFile(file.path, signedFilePath, (err) => {
    if (err) {
      console.error('Error simulating signed PDF:', err);
      return res.status(500).send('Failed to simulate signing process.');
    }

    // Log details of the signed file
    console.log(`Simulated signed file created: ${signedFilePath}`);

    // Respond with the signed file information
    return res.status(200).send(`File uploaded and simulated signed successfully: ${signedFileName}`);
  });
});

module.exports = cont;
