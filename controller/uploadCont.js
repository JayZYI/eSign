const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');  
const FormData = require('form-data');
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
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);  
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter  
});

// File upload route
cont.post('/', upload.single('pdf'), (req, res) => {
  const file = req.file;  
  const nik = req.body.nik;  
  const visual = req.body.visual;  // Access the visual option (visible/invisible)

  // Validate
  const nikError = validateNIK(nik);
  if (nikError) {
    return res.status(400).send(nikError);
  }

  const fileError = validateFile(file);
  if (fileError) {
    return res.status(400).send(fileError);
  }

  console.log('Uploaded file info:', file);
  console.log('NIK:', nik);
  console.log('Visibility option:', visual);  

  const form = new FormData();
  form.append('file', fs.createReadStream(file.path));
  form.append('nik', nik);  
  form.append('tampilan', visual);  

  // Additional parameters for signature placement (can be extended)
  form.append('page', req.body.page || 1);  // Default to page 1 if not provided
  form.append('xAxis', req.body.xAxis || 0);  // Default to 0 if not provided
  form.append('yAxis', req.body.yAxis || 0);  // Default to 0 if not provided
  form.append('width', req.body.width || 100);  // Default to 100px width
  form.append('height', req.body.height || 50);  // Default to 50px height

  // POST request to Esign API
  axios.post('https://10.152.0.110/api/sign/pdf', form, {
    headers: form.getHeaders(), 
  })
    .then(apiResponse => {
      const signedFileName = `signed-${file.filename}`;
      const signedFilePath = path.join('uploads', signedFileName);

      // Save the signed PDF returned by the Esign API
      fs.writeFile(signedFilePath, apiResponse.data, (err) => {
        if (err) {
          console.error('Error saving signed PDF:', err);
          return res.status(500).send('Failed to save the signed PDF.');
        }

        console.log(`Signed file created: ${signedFilePath}`);

        return res.status(200).send(`File uploaded and signed successfully: ${signedFileName}`);
      });
    })
    .catch(err => {
      console.error('Error calling Esign API:', err);
      return res.status(500).send('Failed to sign the PDF using Esign API.');
    });
});

module.exports = cont;
