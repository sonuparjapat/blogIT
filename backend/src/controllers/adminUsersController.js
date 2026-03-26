const pool = require("../config/db");

/* ================= GET USERS ================= */
exports.getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", role = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let values = [];

    /* Search */
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(u.username ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
    }

    /* Role filter */
    if (role) {
      values.push(role);
      conditions.push(`u.role = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    /* Count */
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      values
    );

    const total = parseInt(countRes.rows[0].count);

    /* Data */
    values.push(limit, offset);

    const users = await pool.query(
      `
      SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.is_banned,
  u.created_at,
  COUNT(p.id) AS total_posts,

  s.plan,
  s.expires_at,

  CASE 
    WHEN s.expires_at IS NOT NULL AND s.expires_at > NOW() THEN 'active'
    ELSE 'inactive'
  END AS subscription_status

FROM users u

LEFT JOIN posts p 
  ON p.author_id = u.id AND p.status='published'

LEFT JOIN subscriptions s 
  ON s.user_id = u.id

${where}

GROUP BY u.id, s.plan, s.expires_at
      ORDER BY u.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values
    );

    res.json({
      data: users.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


/* ================= BAN / UNBAN ================= */
exports.toggleBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body;

    await pool.query(
      `UPDATE users SET is_banned=$1 WHERE id=$2`,
      [is_banned, id]
    );

    res.json({ message: "User updated" });

  } catch (err) {
    res.status(500).json({ message: "Failed to update user" });
  }
};


/* ================= CHANGE ROLE ================= */
exports.changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    await pool.query(
      `UPDATE users SET role=$1 WHERE id=$2`,
      [role, id]
    );

    res.json({ message: "Role updated" });

  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
};