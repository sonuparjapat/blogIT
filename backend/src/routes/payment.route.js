const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares/auth");

router.post("/create-order", authenticate, paymentController.createOrder);
router.post("/verify", authenticate, paymentController.verifyPayment);

// Webhook must be raw body
router.post("/webhook", express.json(), paymentController.webhookHandler);

module.exports = router;