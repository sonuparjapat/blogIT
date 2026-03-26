const express = require("express");
const router = express.Router();

const {
  getComments,
  updateCommentStatus,
  deleteComment
} = require("../controllers/adminCommentsController");

/* Routes */
router.get("/", getComments);
router.patch("/:id", updateCommentStatus);
router.delete("/:id", deleteComment);

module.exports = router;