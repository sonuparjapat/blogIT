const express = require("express");
const router = express.Router();

const {
  getWallet,
  getEarnings
} = require("../controllers/walletController");
const { authenticate } = require("../middlewares/auth");

/* Routes */
router.get("/wallet",authenticate, getWallet);
router.get("/wallet/earnings",authenticate, getEarnings);

module.exports = router;