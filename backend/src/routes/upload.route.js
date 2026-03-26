const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");
const { authenticate } = require("../middlewares/auth");

router.post("/", authenticate, upload.uploadSingle, (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload failed"
    });
  }

  res.json({
    success: true,
    url: req.file.location
  });

});

module.exports = router;