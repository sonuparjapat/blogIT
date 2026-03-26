const express = require("express");
const router = express.Router();

const {
  getUsers,
  toggleBan,
  changeRole
} = require("../controllers/adminUsersController");

router.get("/users", getUsers);
router.patch("/users/:id/ban", toggleBan);
router.patch("/users/:id/role", changeRole);

module.exports = router;