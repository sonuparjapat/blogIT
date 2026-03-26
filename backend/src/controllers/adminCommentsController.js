const pool = require("../config/db");

/* ================= GET COMMENTS ================= */
exports.getComments = async (req, res) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let values = [];

    /* Status filter */
    if (status === "approved") {
      conditions.push("c.approved = true");
    } else if (status === "pending") {
      conditions.push("c.approved = false");
    }

    /* Search (username or content) */
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(c.content ILIKE $${values.length} OR u.username ILIKE $${values.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    /* Total count */
    const countQuery = `
      SELECT COUNT(*) 
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      ${where}
    `;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count);

    /* Data query */
    values.push(limit, offset);

    const dataQuery = `
      SELECT 
        c.id,
        c.content,
        c.approved,
        c.created_at,
        p.title AS post_title,
        p.slug,
        u.username
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      LEFT JOIN users u ON c.user_id = u.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const comments = await pool.query(dataQuery, values);

    res.json({
      data: comments.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};


/* ================= UPDATE STATUS ================= */
exports.updateCommentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    await pool.query(
      `UPDATE comments SET approved = $1 WHERE id = $2`,
      [approved, id]
    );

    res.json({ message: "Comment updated" });

  } catch (err) {
    res.status(500).json({ error: "Failed to update comment" });
  }
};


/* ================= DELETE COMMENT ================= */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);

    res.json({ message: "Comment deleted" });

  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
};