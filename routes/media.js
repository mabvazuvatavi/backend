const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Check if S3 is configured
const isS3Configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME);

// Ensure uploads directory exists for fallback
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload a single file to S3 or local storage
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = uniqueSuffix + path.extname(req.file.originalname);

    let fileUrl;

    // Try S3 first if configured
    if (isS3Configured) {
      try {
        const bucketName = process.env.AWS_BUCKET_NAME;
        const params = {
          Bucket: bucketName,
          Key: `images/${fileName}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        fileUrl = `https://${bucketName}.s3.amazonaws.com/images/${fileName}`;
        console.log('File uploaded to S3:', fileUrl);
      } catch (s3Error) {
        console.warn('S3 upload failed, falling back to local storage:', s3Error.message);
        // Fall through to local storage
        fileUrl = null;
      }
    }

    // Fallback to local storage if S3 failed or not configured
    if (!fileUrl) {
      const uploadsSubDir = path.join(uploadsDir, 'images');
      if (!fs.existsSync(uploadsSubDir)) {
        fs.mkdirSync(uploadsSubDir, { recursive: true });
      }

      const filePath = path.join(uploadsSubDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      // Generate local URL (adjust based on your deployment)
      const apiUrl = process.env.API_URL || 'http://localhost:3800';
      fileUrl = `${apiUrl}/uploads/images/${fileName}`;
      console.log('File uploaded locally:', fileUrl);
    }

    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: fileName,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

module.exports = router;
