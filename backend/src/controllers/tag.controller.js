const pool     = require("../config/db");
const slugify  = require("slugify");

/* ── helper ─────────────────────────────────────────────────────────────── */
function makeSlug(name) {
  return slugify(name, { lower: true, strict: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
   GET ALL TAGS
   GET /tags
═══════════════════════════════════════════════════════════════════════════ */
exports.getTags = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.created_at,
        COUNT(pt.post_id)::int AS "postCount"
      FROM tags t
      LEFT JOIN post_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("[getTags]", err);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE TAG
   POST /tags   { name }
═══════════════════════════════════════════════════════════════════════════ */
exports.createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Tag name required" });

    const slug = makeSlug(name.trim());

    const existing = await pool.query("SELECT id FROM tags WHERE slug = $1", [slug]);
    if (existing.rows.length) {
      return res.status(400).json({ message: "Tag already exists" });
    }

    const result = await pool.query(
      `INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING *`,
      [name.trim(), slug]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[createTag]", err);
    res.status(500).json({ message: "Failed to create tag" });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   UPDATE TAG
   PUT /tags/:id   { name }
═══════════════════════════════════════════════════════════════════════════ */
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Tag name required" });

    const slug = makeSlug(name.trim());

    // check slug collision (exclude self)
    const collision = await pool.query(
      "SELECT id FROM tags WHERE slug = $1 AND id != $2",
      [slug, id]
    );
    if (collision.rows.length) {
      return res.status(400).json({ message: "A tag with that name already exists" });
    }

    const result = await pool.query(
      `UPDATE tags SET name = $1, slug = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), slug, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Tag not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[updateTag]", err);
    res.status(500).json({ message: "Failed to update tag" });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE TAG
   DELETE /tags/:id
═══════════════════════════════════════════════════════════════════════════ */
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tags WHERE id = $1", [id]);
    res.json({ message: "Tag deleted" });
  } catch (err) {
    console.error("[deleteTag]", err);
    res.status(500).json({ message: "Failed to delete tag" });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET OR CREATE TAGS BY NAME (bulk upsert — used by post create/update)
   POST /tags/upsert   { names: ["js", "react", ...] }
   Returns array of tag rows
═══════════════════════════════════════════════════════════════════════════ */
exports.upsertTags = async (req, res) => {
  try {
    const names = (req.body.names || [])
      .map(n => String(n).trim())
      .filter(Boolean);

    if (!names.length) return res.json([]);

    const results = [];
    for (const name of names) {
      const slug = makeSlug(name);
      const { rows } = await pool.query(
        `INSERT INTO tags (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [name, slug]
      );
      results.push(rows[0]);
    }
    res.json(results);
  } catch (err) {
    console.error("[upsertTags]", err);
    res.status(500).json({ message: "Failed to upsert tags" });
  }
};