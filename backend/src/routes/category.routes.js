const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/category.controller");
const { authenticate, authorize } = require("../middlewares/auth");

/* ================= GET ================= */

router.get("/", categoryController.getCategories);

/* ================= CREATE ================= */

router.post(
  "/",
  authenticate,
  authorize("admin","editor"),
  categoryController.createCategory
);

/* ================= UPDATE ================= */

router.put("/:id", categoryController.updateCategory);

/* ================= DELETE ================= */

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  categoryController.deleteCategory
);

module.exports = router;