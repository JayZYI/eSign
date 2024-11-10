// controller/uploadConts.js
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

// Basic Auth headers
const getAuthHeader = () => {
  return 'Basic ' + Buffer.from('username:password').toString('base64');
};

cont.post('/request-totp', (req, res) => {
  const { nik, email } = req.body;
  console.log('Requesting TOTP for:', nik ? `NIK: ${nik}` : `Email: ${email}`);

  axios.post('https://10.152.0.110/api/v2/sign/get/totp', {
    nik: nik || undefined,
    email: email || undefined,
    data: 1 // Files to be signed
  }, {
    headers: {
      Authorization: getAuthHeader()
    }
  })
  .then(response => {
    console.log('TOTP requested successfully:', response.data);
    res.status(200).send('TOTP requested successfully. Check your email.');
  })
  .catch(err => {
    console.error('Failed to request TOTP:', err);
    res.status(500).send('Failed to request TOTP.');
  });
});

cont.post('/activate-seal', (req, res) => {
  const idSubscriber = req.body.idSubscriber; 
  console.log('Activating TOTP for seal with idSubscriber:', idSubscriber);

  axios.post('https://10.152.0.110/api/v2/seal/get/activation', { idSubscriber }, {
    headers: {
      Authorization: getAuthHeader()
    }
  })
  .then(response => {
    console.log('Seal TOTP activated:', response.data);
    res.status(200).send('Seal TOTP activated. Check your email.');
  })
  .catch(err => {
    console.error('Failed to activate seal TOTP:', err);
    res.status(500).send('Failed to activate seal TOTP.');
  });
});

cont.post('/request-seal-otp', (req, res) => {
  const { idSubscriber, totp } = req.body;
  console.log('Requesting OTP for seal with idSubscriber:', idSubscriber);

  axios.post('https://10.152.0.110/api/v2/seal/get/totp', {
    idSubscriber,
    data: 1, // Files to be sealed
    totp
  }, {
    headers: {
      Authorization: getAuthHeader()
    }
  })
  .then(response => {
    console.log('Seal OTP requested successfully:', response.data);
    res.status(200).send('Seal OTP requested successfully. Check your email.');
  })
  .catch(err => {
    console.error('Failed to request seal OTP:', err);
    res.status(500).send('Failed to request seal OTP.');
  });
});

cont.post('/seal-pdf', upload.single('pdf'), (req, res) => {
  const file = req.file;  
  const idSubscriber = req.body.idSubscriber;  
  const totp = req.body.totp;  
  const visual = req.body.visual;

  const form = new FormData();
  form.append('file', fs.createReadStream(file.path));
  form.append('idSubscriber', idSubscriber);
  form.append('totp', totp);
  form.append('signatureProperties', JSON.stringify({
    tampilan: visual,
    location: req.body.location || null,
    reason: req.body.reason || null
  }));

  console.log('Sending PDF for sealing with idSubscriber:', idSubscriber);

  axios.post('https://10.152.0.110/api/v2/seal/pdf', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: getAuthHeader()
    }
  })
  .then(apiResponse => {
    const sealedFileName = `sealed-${file.filename}`;
    const sealedFilePath = path.join('uploads', sealedFileName);

    fs.writeFile(sealedFilePath, apiResponse.data, (err) => {
      if (err) {
        console.error('Error saving sealed PDF:', err);
        return res.status(500).send('Failed to save the sealed PDF.');
      }

      console.log(`Sealed file created: ${sealedFilePath}`);
      return res.status(200).send(`File sealed successfully: ${sealedFileName}`);
    });
  })
  .catch(err => {
    console.error('Error calling seal PDF API:', err);
    return res.status(500).send('Failed to seal the PDF using Esign API.');
  });
});

cont.post('/', upload.single('pdf'), (req, res) => {
  const file = req.file;  
  const nik = req.body.nik;  
  const visual = req.body.visual;
  const passphrase = req.body.passphrase;
  const totp = req.body.totp;

  const nikError = validateNIK(nik);
  if (nikError) {
    console.log('NIK validation failed:', nikError);
    return res.status(400).send(nikError);
  }

  const fileError = validateFile(file);
  if (fileError) {
    console.log('File validation failed:', fileError);
    return res.status(400).send(fileError);
  }

  console.log('Uploaded file info:', file);
  console.log('NIK:', nik);
  console.log('Visibility option:', visual);

  const form = new FormData();
  form.append('file', fs.createReadStream(file.path));
  form.append('nik', nik);
  form.append('tampilan', visual);
  form.append('passphrase', passphrase || undefined); // passphrase if provided
  form.append('totp', totp || undefined); // TOTP if provided

  axios.post('https://10.152.0.110/api/v2/sign/pdf', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: getAuthHeader()
    }
  })
  .then(apiResponse => {
    const signedFileName = `signed-${file.filename}`;
    const signedFilePath = path.join('uploads', signedFileName);

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
