// routes/upload.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

// Ensure 'uploads' folder exists
if (!fs.existsSync('uploads/')) {
  fs.mkdirSync('uploads/');
}

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
router.post('/', upload.single('avatar'), (req, res) => {
  const file = req.file;
  const nik = req.body.nik;

  // Validate if NIK is an integer
  if (!/^\d+$/.test(nik)) {
    return res.status(400).send('NIK must be an integer.');
  }

  if (!file) {
    return res.status(400).send('No file uploaded or file format is incorrect. Only PDF files are allowed.');
  }

  console.log('Uploaded file info:', file);
  console.log('NIK:', nik);

  return res.status(200).send(`File uploaded successfully: ${file.filename}`);
});

module.exports = router;
