const pool = require("../config/db");

/* ================= DASHBOARD STATS ================= */

exports.dashboardStats = async (req, res) => {
   try {

const [users, posts, views, revenue, subs] = await Promise.all([
  pool.query("SELECT COUNT(*) FROM users"),
  pool.query("SELECT COUNT(*) FROM posts WHERE status='published'"),
  pool.query("SELECT SUM(views) FROM posts"),
  pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='paid'"),
  pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE expires_at > NOW()) AS active,
      COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired
    FROM subscriptions
  `)
]);

    /* 🔥 TOP POSTS */
    const topPosts = await pool.query(`
      SELECT id, title, views
      FROM posts
      WHERE status='published'
      ORDER BY views DESC
      LIMIT 5
    `);

    /* 🔥 RECENT POSTS */
    const recentPosts = await pool.query(`
      SELECT id, title, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 5
    `);

const dailyViews = await pool.query(`
  SELECT date, SUM(views) as views
  FROM post_analytics
  GROUP BY date
  ORDER BY date ASC
  LIMIT 30
`);

    res.json({
      total_users: users.rows[0].count,
      total_posts: posts.rows[0].count,
      total_views: views.rows[0].sum || 0,


      top_posts: topPosts.rows,
      recent_posts: recentPosts.rows,
      daily_views: dailyViews.rows,
  total_revenue: revenue.rows[0].total,
active_subscriptions: subs.rows[0].active,
expired_subscriptions: subs.rows[0].expired,
    });

  } catch (err) {
    res.status(500).json({ message: "Stats error" });
  }
};


/* ================= GET ALL USERS ================= */

exports.getAllUsers = async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, username, email, role, verified, is_banned, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(users.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= BAN / UNBAN USER ================= */

exports.toggleBanUser = async (req, res) => {
  try {
    const { userId } = req.params;
if (parseInt(userId) === req.user.id) {
  return res.status(400).json({
    message: "You cannot ban yourself"
  });
}
    const user = await pool.query(
      `UPDATE users
       SET is_banned = NOT is_banned
       WHERE id=$1
       RETURNING id, username, is_banned`,
      [userId]
    );

if (!user.rows.length) {
  return res.status(404).json({ message: "User not found" });
}

res.json(user.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= CHANGE USER ROLE ================= */

exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "editor", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
if (role !== "admin") {

  const admins = await pool.query(
    "SELECT COUNT(*) FROM users WHERE role='admin'"
  );

  if (admins.rows[0].count == 1) {
    return res.status(400).json({
      message: "At least one admin must exist"
    });
  }

}
    const updated = await pool.query(
      `UPDATE users
       SET role=$1
       WHERE id=$2
       RETURNING id, username, role`,
      [role, userId]
    );

    res.json(updated.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= GET ALL POSTS (ADMIN VIEW) ================= */

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await pool.query(
      `SELECT p.id, 
       p.title, 
       p.slug, 
       p.status, 
       p.views,
       p.reading_time,
       p.created_at,
       p.is_premium,
       u.username
       FROM posts p
       JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC`
    );

    res.json(posts.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= UPDATE POST STATUS ================= */

exports.updatePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    if (!["draft", "published", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await pool.query(
      `UPDATE posts
       SET status=$1
       WHERE id=$2
       RETURNING id, title, status`,
      [status, postId]
    );

    res.json(updated.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= SOFT DELETE POST ================= */

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
const post = await pool.query(
  `UPDATE posts
   SET deleted=true
   WHERE id=$1
   RETURNING id`,
  [postId]
);

if (!post.rows.length) {
  return res.status(404).json({
    message: "Post not found"
  });
}

res.json({ message: "Post deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};