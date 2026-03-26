const express = require("express");
const router = express.Router();

const revenueController = require("../controllers/revenue.controller");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/role");

router.get("/creator", authenticate, revenueController.getCreatorEarnings);

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  revenueController.getPlatformRevenue
);

module.exports = router;