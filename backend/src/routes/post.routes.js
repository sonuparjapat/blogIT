const express    = require("express");
const router     = express.Router();
 
const postController          = require("../controllers/post.controller");
const { authenticate, optionalAuth } = require("../middlewares/auth");
const { uploadPostImages, uploadSingle } = require("../middlewares/upload");
const { authorize } = require("../middlewares/role");
 
/* ─────────────────────────────────────────────────────────────────────────
   EDITOR INLINE IMAGE UPLOAD
   POST /upload
   Used by TipTap editor to upload images mid-writing.
   Separate from post creation so it works independently.
───────────────────────────────────────────────────────────────────────── */
router.post(
  "/upload",
  authenticate,
  uploadSingle,
  postController.uploadEditorImage
);
 
/* ─────────────────────────────────────────────────────────────────────────
   CREATE POST
   POST /posts
   multipart/form-data — all text fields + optional images
───────────────────────────────────────────────────────────────────────── */
router.post(
  "/",
  authenticate,
  uploadPostImages,
  postController.createPost
);
 
/* ─────────────────────────────────────────────────────────────────────────
   UPDATE POST
   PATCH /posts/:id
   multipart/form-data — send only the fields you want to change
───────────────────────────────────────────────────────────────────────── */
router.patch(
  "/:id",
  authenticate,
  uploadPostImages,
  postController.updatePost
);
 
/* ─────────────────────────────────────────────────────────────────────────
   DELETE ROUTES
───────────────────────────────────────────────────────────────────────── */
 
// Soft delete (author or admin)
router.delete(
  "/:id",
  authenticate,
  postController.deletePost
);
 
// Hard delete — permanently removes DB row + S3 assets (admin only)
router.delete(
  "/:id/hard",
  authenticate,
  postController.hardDeletePost
);
 
// Delete a single gallery image
router.delete(
  "/:id/gallery/:imageId",
  authenticate,
  postController.deleteGalleryImage
);
 
/* ─────────────────────────────────────────────────────────────────────────
   READ ROUTES
   Note: specific paths must come BEFORE /:slug to avoid route conflicts
───────────────────────────────────────────────────────────────────────── */
 
// Paginated public list
router.get("/",optionalAuth, postController.listPosts);
 
// Author's own posts (drafts + published)
router.get("/mine", authenticate, postController.myPosts);
 
// Full-text search
router.get("/search", postController.searchPosts);
 
// Trending (by views)
router.get("/trending", postController.getTrendingPosts);
 
// Related posts (by shared categories)
router.get("/related/:postId", postController.getRelatedPosts);
 
// Posts by category slug
router.get("/category/:slug", postController.getPostsByCategory);
 
// Fetch by numeric id — used by edit page
router.get("/id/:id", optionalAuth, postController.getPostById);
 router.patch("/:id/publish",   authenticate, authorize("admin", "editor"), postController.publishPost);
router.patch("/:id/unpublish", authenticate, authorize("admin", "editor"), postController.unpublishPost);
// Single post by slug — MUST be last to avoid swallowing the routes above
router.get("/:slug", optionalAuth, postController.getPostBySlug);
 
module.exports = router;