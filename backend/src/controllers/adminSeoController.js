const pool = require("../config/db");

/* ── ADD KEYWORDS ────────────────────────────────────────────────────────
   POST /seo
   Body: { post_id: number, keywords: string[] }
   Skips duplicates silently via ON CONFLICT DO NOTHING
──────────────────────────────────────────────────────────────────────── */
exports.addKeywords = async (req, res) => {
  try {
    const { post_id, keywords } = req.body;

    if (!post_id || !Array.isArray(keywords) || !keywords.length) {
      return res.status(400).json({ message: "post_id and a non-empty keywords array are required" });
    }

    const cleaned = keywords
      .map(k => String(k).trim().toLowerCase())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i); // deduplicate within request

    if (!cleaned.length) {
      return res.status(400).json({ message: "No valid keywords provided" });
    }

    const placeholders = cleaned.map((_, i) => `($1, $${i + 2})`).join(", ");
    const values       = [post_id, ...cleaned];

    await pool.query(
      `INSERT INTO seo_keywords (post_id, keyword)
       VALUES ${placeholders}
       ON CONFLICT (post_id, keyword) DO NOTHING`,
      values
    );

    // return the current full list so client stays in sync
    const result = await pool.query(
      `SELECT id, keyword FROM seo_keywords WHERE post_id = $1 ORDER BY id`,
      [post_id]
    );

    res.json({ message: "Keywords added", keywords: result.rows });

  } catch (err) {
    console.error("[addKeywords]", err);
    res.status(500).json({ message: "Error adding keywords" });
  }
};

/* ── GET KEYWORDS ────────────────────────────────────────────────────────
   GET /seo/:post_id
──────────────────────────────────────────────────────────────────────── */
exports.getKeywords = async (req, res) => {
  try {
    const { post_id } = req.params;

    const result = await pool.query(
      `SELECT id, keyword FROM seo_keywords WHERE post_id = $1 ORDER BY id`,
      [post_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("[getKeywords]", err);
    res.status(500).json({ message: "Error fetching keywords" });
  }
};

/* ── DELETE KEYWORD ──────────────────────────────────────────────────────
   DELETE /seo/:id
──────────────────────────────────────────────────────────────────────── */
exports.deleteKeyword = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM seo_keywords WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Keyword not found" });
    }

    res.json({ message: "Keyword deleted" });

  } catch (err) {
    console.error("[deleteKeyword]", err);
    res.status(500).json({ message: "Error deleting keyword" });
  }
};