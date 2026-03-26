const express    = require("express");
const router     = express.Router();
const tagCtrl    = require("../controllers/tag.controller");
const { authenticate, authorize } = require("../middlewares/auth");

/* public */
router.get("/", tagCtrl.getTags);

/* authenticated — bulk upsert used by post create/update */
router.post("/upsert", authenticate, tagCtrl.upsertTags);

/* admin/editor only */
router.post(   "/",    authenticate, authorize("admin","editor"), tagCtrl.createTag);
router.put(    "/:id", authenticate, authorize("admin","editor"), tagCtrl.updateTag);
router.delete( "/:id", authenticate, authorize("admin"),          tagCtrl.deleteTag);

module.exports = router;