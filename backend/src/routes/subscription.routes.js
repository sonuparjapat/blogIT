const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/subscription.controller");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/role");

router.post("/create_order", authenticate, ctrl.createOrder);
router.post("/verifyorder", authenticate, ctrl.verifyPayment);
router.get("/me", authenticate, ctrl.getMySubscription);
router.get("/",              authenticate, authorize("admin"), ctrl.adminListSubscriptions);
router.get(   "/stats",        authenticate, authorize("admin"), ctrl.adminStats);
router.get(   "/export",       authenticate, authorize("admin"), ctrl.adminExportCSV);
router.delete("/:userId",      authenticate, authorize("admin"), ctrl.adminRevoke);
router.patch( "/:userId/extend", authenticate, authorize("admin"), ctrl.adminExtend);
module.exports = router;