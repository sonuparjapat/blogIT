const express = require("express");
const router = express.Router();

const {
  requestPayout,
  getMyPayouts,
  getAllPayouts,
  approvePayout,
  rejectPayout
} = require("../controllers/payoutController");
const { authenticate } = require("../middlewares/auth");

/* USER */
router.post("/request",authenticate, requestPayout);
router.get("/my",authenticate, getMyPayouts);

/* ADMIN */
router.get("/", getAllPayouts);
router.post("/:id/approve",authenticate, approvePayout);
router.post("/:id/reject",authenticate, rejectPayout);

module.exports = router;