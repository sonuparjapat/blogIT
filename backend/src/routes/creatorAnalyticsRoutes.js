const express = require("express");
const router = express.Router();

const {
  getCreatorAnalytics
} = require("../controllers/creatorAnalytics.controller");
const { authenticate } = require("../middlewares/auth");

router.get("/creator/analytics",authenticate, getCreatorAnalytics);

module.exports = router;