const express = require("express");
const router = express.Router();

const {
  addKeywords,
  getKeywords,
  deleteKeyword
} = require("../controllers/adminSeoController");

router.post("/seo", addKeywords);
router.get("/seo/:post_id", getKeywords);
router.delete("/seo/:id", deleteKeyword);

module.exports = router;