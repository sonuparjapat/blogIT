const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/role");

router.use(authenticate);
router.use(authorize("admin"));

router.get("/stats", adminController.dashboardStats);

router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/ban", adminController.toggleBanUser);
router.patch("/users/:userId/role", adminController.changeUserRole);

router.get("/posts", adminController.getAllPosts);
router.patch("/posts/:postId/status", adminController.updatePostStatus);
router.delete("/posts/:postId", adminController.deletePost);

module.exports = router;