const pool              = require("../config/db");

const {calcReadingTime}=require("../../utils/ReadingTime")
const { deleteFromS3 }    = require("../middlewares/upload");
 const {generateUniqueSlug}=require("../../utils/generateUniqueSlug")
/* ─── tiny helper — pull the S3 location from multer-s3 ─────────────────── */
const fileUrl = (file) => file?.location || null;
 
/* ═══════════════════════════════════════════════════════════════════════════
   CREATE POST
   POST /posts
   Body  : FormData  (multipart/form-data)
   Files : featured_image (optional), gallery_images[] (optional, max 10)
═══════════════════════════════════════════════════════════════════════════ */
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      content,          // JSON string from FormData
      excerpt       = "",
      seo_title     = "",
      seo_description = "",
      status        = "draft",
      is_premium    = "false",
      scheduled_at,
      slug: customSlug,
    } = req.body;
 
    /* ── validation ── */
    if (!title?.trim())   return res.status(400).json({ message: "Title is required" });
    if (!content?.trim()) return res.status(400).json({ message: "Content is required" });
 
    /* ── parse content ── */
    let parsedContent;
    try {
      parsedContent = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      return res.status(400).json({ message: "Invalid content JSON" });
    }
 
    /* ── slug ── */
    const slug = customSlug?.trim()
      ? await generateUniqueSlug(customSlug)
      : await generateUniqueSlug(title);
 
    /* ── reading time ── */
    const readingTime = calcReadingTime(parsedContent);
 
    /* ── images ── */
    const featuredImageUrl = fileUrl(req.files?.featured_image?.[0]) || null;
    const galleryUrls      = (req.files?.gallery_images || []).map(fileUrl).filter(Boolean);
 
    /* ── premium / schedule ── */
 const isAdmin  = req.user.role === "admin" || req.user.role === "editor";
const premium  = is_premium === "true" || is_premium === true;
const scheduled = scheduled_at || null;

// 🔥 ROLE-BASED STATUS CONTROL
let finalStatus = status;

if (!isAdmin) {
  if (status === "published") finalStatus = "pending";
  if (!["draft", "pending"].includes(status)) finalStatus = "draft";
}
 
    /* ── insert ── */
    const { rows } = await pool.query(
      `INSERT INTO posts
         (title, slug, content, excerpt, featured_image,
          seo_title, seo_description, reading_time,
          status, is_premium, scheduled_at, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, title, slug, status, created_at`,
      [
        title.trim(),
        slug,
        parsedContent,
        excerpt,
        featuredImageUrl,
        seo_title,
        seo_description,
        readingTime,
        finalStatus,
        premium,
        scheduled,
        req.user.id,
      ]
    );
 
    const post = rows[0];
 
    /* ── persist gallery in separate table (if it exists) ── */
    if (galleryUrls.length) {
      const values  = galleryUrls.map((url, i) => `($1, $${i + 2})`).join(", ");
      const params  = [post.id, ...galleryUrls];
      await pool.query(
        `INSERT INTO post_gallery (post_id, url) VALUES ${values}`,
        params
      ).catch(() => {
        /* post_gallery table is optional — ignore if not yet created */
      });
    }
/* ── categories ── */
const categoryIds = [].concat(req.body["category_ids[]"] || req.body.category_ids || []).filter(Boolean)
if (categoryIds.length) {
  const values = categoryIds.map((_, i) => `($1, $${i + 2})`).join(", ")
  await pool.query(
    `INSERT INTO post_categories (post_id, category_id) VALUES ${values}`,
    [post.id, ...categoryIds]
  ).catch(() => {})
}
 
/* ── tags — upsert by name then link ── */
const tagNames = [].concat(req.body["tag_names[]"] || req.body.tag_names || []).filter(Boolean)
if (tagNames.length) {
  // upsert each tag (create if not exists, return id)
  const tagRows = []
  for (const name of tagNames) {
    const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_]+/g,"-")
    const { rows } = await pool.query(
      `INSERT INTO tags (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name.trim(), slug]
    )
    tagRows.push(rows[0])
  }
  // link to post
  const tagValues = tagRows.map((_, i) => `($1, $${i + 2})`).join(", ")
  await pool.query(
    `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues}`,
    [post.id, ...tagRows.map(r => r.id)]
  ).catch(() => {})
}
    return res.status(201).json({
      success: true,
      data:    { ...post, gallery: galleryUrls },
    });
 
  } catch (err) {
    console.error("[createPost]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   UPDATE POST
   PATCH /posts/:id
   Body  : FormData  (same shape as create; only send changed fields)
   Files : featured_image (optional — replaces old one on S3)
           gallery_images[] (optional — appended to existing gallery)
═══════════════════════════════════════════════════════════════════════════ */
exports.updatePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });
 
    /* ── fetch existing post ── */
    const existing = await pool.query(
      `SELECT * FROM posts WHERE id = $1 AND deleted = false`,
      [postId]
    );
    if (!existing.rows.length) return res.status(404).json({ message: "Post not found" });
 
    const old = existing.rows[0];
 
    /* ── ownership check (allow admin to bypass) ── */
  const isAdmin = req.user.role === "admin" || req.user.role === "editor";

// Non-admin: can only edit their own posts
if (!isAdmin && old.author_id !== req.user.id) {
  return res.status(403).json({ message: "Forbidden" });
}

// Non-admin: cannot edit published posts
if (!isAdmin && old.status === "published") {
  return res.status(403).json({ message: "Published posts cannot be edited" });
}
 
    /* ── destructure body — use existing values as fallback ── */
    const {
      title           = old.title,
      content,
      excerpt         = old.excerpt,
      seo_title       = old.seo_title,
      seo_description = old.seo_description,
      status          = old.status,
      is_premium,
      scheduled_at,
      slug: customSlug,
      remove_featured_image = "false",     // "true" → explicitly delete
    } = req.body;
    let finalStatus = status;

if (!isAdmin) {
  if (status === "published") finalStatus = "pending";
  if (!["draft", "pending"].includes(status)) finalStatus = old.status;
}
 
    /* ── parse content if provided ── */
    let parsedContent = old.content;
    if (content) {
      try {
        parsedContent = typeof content === "string" ? JSON.parse(content) : content;
      } catch {
        return res.status(400).json({ message: "Invalid content JSON" });
      }
    }
 
    /* ── reading time ── */
    const readingTime = calcReadingTime(parsedContent);
 
    /* ── slug (only regenerate if title or customSlug changed) ── */
    let slug = old.slug;
    if (customSlug?.trim() && customSlug.trim() !== old.slug) {
      slug = await generateUniqueSlug(customSlug.trim(), postId);
    } else if (title !== old.title) {
      slug = await generateUniqueSlug(title, postId);
    }
 
    /* ── featured image handling ── */
    let featuredImageUrl = old.featured_image;
 
    if (remove_featured_image === "true") {
      await deleteFromS3(old.featured_image);
      featuredImageUrl = null;
    }
 
    if (req.files?.featured_image?.[0]) {
      // Delete the old one before replacing
      await deleteFromS3(old.featured_image);
      featuredImageUrl = fileUrl(req.files.featured_image[0]);
    }
 
    /* ── gallery — append new files ── */
    const newGalleryUrls = (req.files?.gallery_images || []).map(fileUrl).filter(Boolean);
    if (newGalleryUrls.length) {
      const values = newGalleryUrls.map((_, i) => `($1, $${i + 2})`).join(", ");
      await pool.query(
        `INSERT INTO post_gallery (post_id, url) VALUES ${values}`,
        [postId, ...newGalleryUrls]
      ).catch(() => { /* optional table */ });
    }

/* ── categories — replace ── */
const rawCatIds = req.body["category_ids[]"] || req.body.category_ids
if (rawCatIds !== undefined) {
  const categoryIds = [].concat(rawCatIds).filter(Boolean)
  await pool.query(`DELETE FROM post_categories WHERE post_id = $1`, [postId])
  if (categoryIds.length) {
    const values = categoryIds.map((_, i) => `($1, $${i + 2})`).join(", ")
    await pool.query(
      `INSERT INTO post_categories (post_id, category_id) VALUES ${values}`,
      [postId, ...categoryIds]
    ).catch(() => {})
  }
}
 
/* ── tags — replace ── */
const rawTagNames = req.body["tag_names[]"] || req.body.tag_names
if (rawTagNames !== undefined) {
  const tagNames = [].concat(rawTagNames).filter(Boolean)
  // delete existing links
  await pool.query(`DELETE FROM post_tags WHERE post_id = $1`, [postId])
  if (tagNames.length) {
    const tagRows = []
    for (const name of tagNames) {
      const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_]+/g,"-")
      const { rows } = await pool.query(
        `INSERT INTO tags (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name.trim(), slug]
      )
      tagRows.push(rows[0])
    }
    const tagValues = tagRows.map((_, i) => `($1, $${i + 2})`).join(", ")
    await pool.query(
      `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues}`,
      [postId, ...tagRows.map(r => r.id)]
    ).catch(() => {})
  }
}
 
 
    /* ── premium / schedule ── */
    const premium = is_premium !== undefined
      ? (is_premium === "true" || is_premium === true)
      : old.is_premium;
 
    const scheduled = scheduled_at !== undefined ? (scheduled_at || null) : old.scheduled_at;
 
    /* ── update ── */
    const { rows } = await pool.query(
      `UPDATE posts SET
         title           = $1,
         slug            = $2,
         content         = $3,
         excerpt         = $4,
         featured_image  = $5,
         seo_title       = $6,
         seo_description = $7,
         reading_time    = $8,
         status          = $9,
         is_premium      = $10,
         scheduled_at    = $11,
         updated_at      = NOW()
       WHERE id = $12
       RETURNING id, title, slug, status, updated_at`,
      [
        title.trim(),
        slug,
        parsedContent,
        excerpt,
        featuredImageUrl,
        seo_title,
        seo_description,
        readingTime,
        finalStatus,
        premium,
        scheduled,
        postId,
      ]
    );
 
    return res.json({ success: true, data: rows[0] });
 
  } catch (err) {
    console.error("[updatePost]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   SOFT DELETE POST
   DELETE /posts/:id
═══════════════════════════════════════════════════════════════════════════ */
exports.deletePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });
 
    const existing = await pool.query(
      `SELECT author_id, featured_image FROM posts WHERE id = $1 AND deleted = false`,
      [postId]
    );
    if (!existing.rows.length) return res.status(404).json({ message: "Post not found" });
 
    const { author_id } = existing.rows[0];
 
    if (author_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
 
    /* Soft delete — keeps data for analytics / recovery */
    await pool.query(
      `UPDATE posts SET deleted = true, updated_at = NOW() WHERE id = $1`,
      [postId]
    );
 
    return res.json({ success: true, message: "Post deleted" });
 
  } catch (err) {
    console.error("[deletePost]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   HARD DELETE POST  (admin only — also purges S3 assets)
   DELETE /posts/:id/hard
═══════════════════════════════════════════════════════════════════════════ */
exports.hardDeletePost = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
 
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });
 
    const existing = await pool.query(
      `SELECT featured_image FROM posts WHERE id = $1`,
      [postId]
    );
    if (!existing.rows.length) return res.status(404).json({ message: "Post not found" });
 
    /* Pull gallery URLs before deleting rows */
    const gallery = await pool.query(
      `SELECT url FROM post_gallery WHERE post_id = $1`,
      [postId]
    ).catch(() => ({ rows: [] }));
 
    /* Delete S3 assets in parallel */
    const s3Deletes = [
      deleteFromS3(existing.rows[0].featured_image),
      ...gallery.rows.map((r) => deleteFromS3(r.url)),
    ];
    await Promise.allSettled(s3Deletes);
 
    /* Hard delete (cascades to post_gallery, post_tags, post_categories via FK) */
    await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);
 
    return res.json({ success: true, message: "Post permanently deleted" });
 
  } catch (err) {
    console.error("[hardDeletePost]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   DELETE GALLERY IMAGE
   DELETE /posts/:id/gallery/:imageId
═══════════════════════════════════════════════════════════════════════════ */
exports.deleteGalleryImage = async (req, res) => {
  try {
    const postId  = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
 
    const post = await pool.query(
      `SELECT author_id FROM posts WHERE id = $1 AND deleted = false`,
      [postId]
    );
    if (!post.rows.length) return res.status(404).json({ message: "Post not found" });
    if (post.rows[0].author_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
 
    const img = await pool.query(
      `SELECT url FROM post_gallery WHERE id = $1 AND post_id = $2`,
      [imageId, postId]
    ).catch(() => ({ rows: [] }));
 
    if (!img.rows.length) return res.status(404).json({ message: "Image not found" });
 
    await deleteFromS3(img.rows[0].url);
    await pool.query(`DELETE FROM post_gallery WHERE id = $1`, [imageId]).catch(() => {});
 
    return res.json({ success: true, message: "Image deleted" });
 
  } catch (err) {
    console.error("[deleteGalleryImage]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   LIST POSTS  (paginated)
   GET /posts?page=1&limit=10&status=published
═══════════════════════════════════════════════════════════════════════════ */
exports.listPosts = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const isPrivileged = req.user && (req.user.role === "admin" || req.user.role === "editor")
    const statusFilter   = req.query.status      // undefined | "draft" | "published"
    const categoryFilter = req.query.category_id // undefined | "5" etc

    // ── build conditions ──────────────────────────────────────────────────
    const conditions = []
    const queryParams = []

    // deleted check — always
    conditions.push(`p.deleted = false`)

    // status
    if (isPrivileged && statusFilter) {
      queryParams.push(statusFilter)
      conditions.push(`p.status = $${queryParams.length}`)
    } else if (!isPrivileged) {
      conditions.push(`p.status = 'published'`)
    }

    // category
    if (categoryFilter) {
      queryParams.push(Number(categoryFilter))
      conditions.push(`
        EXISTS (
          SELECT 1 FROM post_categories pc2
          WHERE pc2.post_id = p.id AND pc2.category_id = $${queryParams.length}
        )
      `)
    }
    const tagFilter = req.query.tag_id
if (tagFilter) {
  queryParams.push(Number(tagFilter))
  conditions.push(`
    EXISTS (
      SELECT 1 FROM post_tags pt2
      WHERE pt2.post_id = p.id AND pt2.tag_id = $${queryParams.length}
    )
  `)
}

    const whereClause = conditions.join(" AND ")

    // ── count params (no limit/offset) ────────────────────────────────────
    const countParams = [...queryParams]

    // ── add limit/offset to main query params ─────────────────────────────
    queryParams.push(limit)
    const limitParam = `$${queryParams.length}`
    queryParams.push(offset)
    const offsetParam = `$${queryParams.length}`

    const [posts, countResult] = await Promise.all([
     pool.query(
  `SELECT
   p.id, p.title, p.slug, p.featured_image, p.content, p.seo_title, p.seo_description, p.scheduled_at,
   p.excerpt, p.views, p.reading_time, p.author_id,
   p.status, p.is_premium, p.created_at, p.updated_at,
   u.username, u.display_name, u.avatar,
   COALESCE((
     SELECT JSON_AGG(JSON_BUILD_OBJECT('id', g.id, 'image_url', g.url))
     FROM post_gallery g WHERE g.post_id = p.id
   ), '[]') AS galary,
   COALESCE(
     json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
     FILTER (WHERE c.id IS NOT NULL), '[]'
   ) AS categories,
   COALESCE(
     json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
     FILTER (WHERE t.id IS NOT NULL), '[]'
   ) AS tags
 FROM posts p
 LEFT JOIN post_gallery pg ON p.id = pg.post_id
 JOIN users u ON p.author_id = u.id
 LEFT JOIN post_categories pc ON p.id = pc.post_id
 LEFT JOIN categories c ON pc.category_id = c.id
 LEFT JOIN post_tags pt ON p.id = pt.post_id
 LEFT JOIN tags t ON pt.tag_id = t.id
 WHERE ${whereClause}
 GROUP BY p.id, u.username, u.display_name, u.avatar
 ORDER BY p.created_at DESC
 LIMIT ${limitParam} OFFSET ${offsetParam}`,
  queryParams
),
      pool.query(
  `SELECT COUNT(*) FROM (
     SELECT p.id
     FROM posts p
     WHERE ${whereClause}
     GROUP BY p.id
   ) AS count_query`,
  countParams
),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return res.json({
      success: true,
      data: posts.rows,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });

  } catch (err) {
    console.error("[listPosts]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   MY POSTS  (authenticated author — drafts + published)
   GET /posts/mine?page=1&status=draft
═══════════════════════════════════════════════════════════════════════════ */
exports.myPosts = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const status = req.query.status;                        // optional filter
 
    const params = [req.user.id, limit, offset];
    let whereStatus = "";
    if (status) {
      whereStatus = `AND p.status = $4`;
      params.push(status);
    }
 
    const { rows } = await pool.query(
      `SELECT
         p.id, p.title, p.slug, p.featured_image,
         p.status, p.views, p.reading_time,
         p.is_premium, p.created_at, p.updated_at
       FROM posts p
       WHERE p.author_id = $1
         AND p.deleted   = false
         ${whereStatus}
       ORDER BY p.updated_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );
 
    return res.json({ success: true, data: rows });
 
  } catch (err) {
    console.error("[myPosts]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   GET SINGLE POST BY SLUG
   GET /posts/:slug
   — increments unique-IP view count
   — enforces premium paywall
═══════════════════════════════════════════════════════════════════════════ */
exports.getPostBySlug = async (req, res) => {
  const client = await pool.connect();

  try {
    const { slug } = req.params;
    const userId = req.user?.id || null;
console.log(req.user,"reqcoming")
    const userIp =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "0.0.0.0";

    await client.query("BEGIN");

    /* ── fetch post with EVERYTHING (SEO READY) ── */
    const { rows } = await client.query(
      `
      SELECT
        p.*,
        u.username, u.display_name, u.avatar, u.bio,

        /* categories */
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug
          )) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories,

        /* tags */
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug
          )) FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags,

        /* 🔥 SEO KEYWORDS */
        COALESCE(
          json_agg(DISTINCT sk.keyword)
          FILTER (WHERE sk.keyword IS NOT NULL), '[]'
        ) AS keywords

      FROM posts p
      JOIN users u ON p.author_id = u.id

      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id

      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id

      LEFT JOIN seo_keywords sk ON sk.post_id = p.id

      WHERE p.slug = $1
        AND p.status = 'published'
        AND p.deleted = false

      GROUP BY p.id, u.id
      `,
      [slug]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Post not found" });
    }

    const post = rows[0];

    /* ── premium paywall ── */
let isLocked = false;

if (post.is_premium) {

  if (!userId) {
    isLocked = true;
  } else if (userId == post.author_id) {
    isLocked = false; // 👈 author can always read
  } else {
    console.log("HIDKFHSUBH")
    const { rows: sub } = await client.query(
      `SELECT 1 FROM subscriptions
       WHERE user_id = $1 AND expires_at > NOW()
       LIMIT 1`,
      [userId]
    );
console.log(sub,"subbbbbb")
    if (!sub.length) isLocked = true;
  }
}


    /* ── gallery ── */
    const gallery = await client.query(
      `SELECT id, url FROM post_gallery WHERE post_id = $1 ORDER BY id`,
      [post.id]
    ).catch(() => ({ rows: [] }));

    /* ── unique view tracking ── */
    const { rows: existingView } = await client.query(
      `SELECT 1 FROM views WHERE post_id = $1 AND ip = $2`,
      [post.id, userIp]
    );

    if (!existingView.length) {
      await client.query(
        `INSERT INTO views (post_id, ip) VALUES ($1, $2)`,
        [post.id, userIp]
      );

      await client.query(
        `UPDATE posts SET views = views + 1 WHERE id = $1`,
        [post.id]
      );

      /* 🔥 DAILY ANALYTICS */
      await client.query(
        `
        INSERT INTO post_analytics (post_id, date, views, unique_views)
        VALUES ($1, CURRENT_DATE, 1, 1)
        ON CONFLICT (post_id, date)
        DO UPDATE SET
          views = post_analytics.views + 1,
          unique_views = post_analytics.unique_views + 1
        `,
        [post.id]
      );

      post.views += 1;
    }

    await client.query("COMMIT");

    /* ── clean response ── */
    delete post.deleted;
    delete post.author_id;
    
function getPreview(content) {
  try {
    const json = typeof content === "string" ? JSON.parse(content) : content;

    return {
      ...json,
      content: json.content?.slice(0, 2), // first 2 blocks
    };
  } catch {
    return content;
  }
}
console.log(isLocked,"post coming")
   return res.json({
  success: true,
  data: {
    ...post,
    gallery: gallery.rows,

    is_locked: isLocked,                // 👈 new
    content: isLocked ? null : post.content,   // 👈 control access
    preview_content: isLocked
      ? getPreview(post.content)        // 👈 optional (first few paragraphs)
      : null,
  },
});

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[getPostBySlug]", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   GET POST BY ID  (for edit page — returns draft too)
   GET /posts/id/:id
═══════════════════════════════════════════════════════════════════════════ */
exports.getPostById = async (req, res) => {
console.log("HIIIIIIIIIIpost by id")
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });

    // ← THIS is where the query goes — rows is defined HERE
    const { rows } = await pool.query(
      `SELECT p.*,
              u.username, u.display_name, u.avatar,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
                FILTER (WHERE c.id IS NOT NULL), '[]'
              ) AS categories,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
                FILTER (WHERE t.id IS NOT NULL), '[]'
              ) AS tags
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN post_categories pc ON p.id = pc.post_id
       LEFT JOIN categories c ON pc.category_id = c.id
       LEFT JOIN post_tags pt ON p.id = pt.post_id
       LEFT JOIN tags t ON pt.tag_id = t.id
       WHERE p.id = $1 AND p.deleted = false
       GROUP BY p.id, u.username, u.display_name, u.avatar`,
      [postId]
    );

    if (!rows.length) return res.status(404).json({ message: "Post not found" });

    const post = rows[0];

    /* Only author or admin can see unpublished posts */
    if (post.status !== "published") {
      if (!req.user || (req.user.id !== post.author_id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const gallery = await pool.query(
      `SELECT id, url AS image_url FROM post_gallery WHERE post_id = $1 ORDER BY id`,
      [postId]
    ).catch(() => ({ rows: [] }));

    return res.json({
      success: true,
      data: { ...post, galary: gallery.rows }   // note: keeping "galary" typo to match frontend
    });

  } catch (err) {
    console.error("[getPostById]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH POSTS
   GET /posts/search?q=term&page=1
═══════════════════════════════════════════════════════════════════════════ */
exports.searchPosts = async (req, res) => {
  try {
    const q      = (req.query.q || "").trim();
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(30, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
 
    if (!q) return res.json({ success: true, data: [], meta: { total: 0 } });
 
    const pattern = `%${q}%`;
 
    const [results, countResult] = await Promise.all([
      pool.query(
        `SELECT
           p.id, p.title, p.slug, p.excerpt,
           p.featured_image, p.reading_time, p.created_at,
           u.username, u.display_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.status  = 'published'
           AND p.deleted = false
           AND (
             p.title   ILIKE $1 OR
             p.excerpt ILIKE $1 OR
             p.seo_title ILIKE $1
           )
         ORDER BY
           CASE WHEN p.title ILIKE $1 THEN 0 ELSE 1 END,  -- exact title match first
           p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM posts
         WHERE status='published' AND deleted=false
           AND (title ILIKE $1 OR excerpt ILIKE $1)`,
        [pattern]
      ),
    ]);
 
    return res.json({
      success: true,
      data:    results.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count, 10),
        query: q,
      },
    });
 
  } catch (err) {
    console.error("[searchPosts]", err);
    return res.status(500).json({ message: "Search failed" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   TRENDING POSTS
   GET /posts/trending?limit=10
═══════════════════════════════════════════════════════════════════════════ */
exports.getTrendingPosts = async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
 
    const { rows } = await pool.query(
      `SELECT
         p.id, p.title, p.slug, p.views,
         p.featured_image, p.reading_time, p.created_at,
         u.username, u.display_name, u.avatar
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.status  = 'published'
         AND p.deleted = false
       ORDER BY p.views DESC
       LIMIT $1`,
      [limit]
    );
 
    return res.json({ success: true, data: rows });
 
  } catch (err) {
    console.error("[getTrendingPosts]", err);
    return res.status(500).json({ message: "Error fetching trending posts" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   RELATED POSTS
   GET /posts/related/:postId?limit=5
═══════════════════════════════════════════════════════════════════════════ */
exports.getRelatedPosts = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });
 
    const limit = Math.min(10, parseInt(req.query.limit) || 5);
 
    const { rows } = await pool.query(
      `SELECT
         p.id, p.title, p.slug, p.featured_image,
         p.excerpt, p.reading_time, p.created_at,
         u.username, u.display_name,
         COUNT(DISTINCT pc2.category_id) AS shared_categories
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_categories pc2 ON p.id = pc2.post_id
       WHERE pc2.category_id IN (
           SELECT category_id FROM post_categories WHERE post_id = $1
         )
         AND p.id      != $1
         AND p.status   = 'published'
         AND p.deleted  = false
       GROUP BY p.id, u.id
       ORDER BY shared_categories DESC, p.views DESC
       LIMIT $2`,
      [postId, limit]
    );
 
    return res.json({ success: true, data: rows });
 
  } catch (err) {
    console.error("[getRelatedPosts]", err);
    return res.status(500).json({ message: "Error fetching related posts" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   POSTS BY CATEGORY
   GET /posts/category/:slug
═══════════════════════════════════════════════════════════════════════════ */
exports.getPostsByCategory = async (req, res) => {
  try {
    const { slug }  = req.params;
    const page      = Math.max(1, parseInt(req.query.page) || 1);
    const limit     = Math.min(30, parseInt(req.query.limit) || 10);
    const offset    = (page - 1) * limit;
 
    const [posts, countResult] = await Promise.all([
      pool.query(
        `SELECT
           p.id, p.title, p.slug, p.featured_image,
           p.excerpt, p.reading_time, p.views, p.created_at,
           u.username, u.display_name
         FROM posts p
         JOIN users u          ON p.author_id     = u.id
         JOIN post_categories pc ON p.id           = pc.post_id
         JOIN categories c     ON pc.category_id  = c.id
         WHERE c.slug    = $1
           AND p.status  = 'published'
           AND p.deleted = false
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [slug, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM posts p
         JOIN post_categories pc ON p.id = pc.post_id
         JOIN categories c ON pc.category_id = c.id
         WHERE c.slug = $1 AND p.status='published' AND p.deleted=false`,
        [slug]
      ),
    ]);
 
    return res.json({
      success: true,
      data:    posts.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
 
  } catch (err) {
    console.error("[getPostsByCategory]", err);
    return res.status(500).json({ message: "Error fetching category posts" });
  }
};
 
/* ═══════════════════════════════════════════════════════════════════════════
   INLINE EDITOR IMAGE UPLOAD
   POST /upload
   Body : FormData — file (single image)
   Returns: { url: "https://..." }
═══════════════════════════════════════════════════════════════════════════ */
exports.uploadEditorImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    return res.json({ success: true, url: req.file.location });
  } catch (err) {
    console.error("[uploadEditorImage]", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};

exports.publishPost = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE posts SET status = 'published', updated_at = NOW()
       WHERE id = $1 AND deleted = false
       RETURNING id, title, slug, status`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error("[publishPost]", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unpublishPost = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE posts SET status = 'draft', updated_at = NOW()
       WHERE id = $1 AND deleted = false
       RETURNING id, title, slug, status`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error("[unpublishPost]", err);
    res.status(500).json({ message: "Server error" });
  }
};
 