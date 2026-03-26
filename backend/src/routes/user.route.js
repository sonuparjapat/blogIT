const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth");

router.get("/profile/:username", userController.getPublicProfile);

router.put("/profile", authenticate, userController.updateProfile);

router.post("/follow/:userId", authenticate, userController.followUser);
router.delete("/follow/:userId", authenticate, userController.unfollowUser);

router.get("/followers/:userId", userController.getFollowers);
router.get("/following/:userId", userController.getFollowing);

module.exports = router;