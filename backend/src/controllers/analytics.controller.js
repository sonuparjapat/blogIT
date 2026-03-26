const pool = require("../config/db");

exports.dashboard = async (req, res) => {
  try {

    /* ================= BASIC STATS ================= */
    const users = await pool.query("SELECT COUNT(*) FROM users");
    const posts = await pool.query("SELECT COUNT(*) FROM posts WHERE status='published'");
    const comments = await pool.query("SELECT COUNT(*) FROM comments");
    const views = await pool.query("SELECT SUM(views) FROM posts");
/* 🔥 NEW: Subscription stats */
const subs = await pool.query(`
  SELECT 
    COUNT(*) FILTER (WHERE expires_at > NOW()) AS active,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired
  FROM subscriptions
`);

/* 🔥 NEW: Revenue */
const revenue = await pool.query(`
  SELECT COALESCE(SUM(amount),0) AS total 
  FROM payments 
  WHERE status='paid'
`);
    /* ================= TOP POSTS ================= */
    const topPosts = await pool.query(`
      SELECT id, title, views
      FROM posts
      WHERE status='published'
      ORDER BY views DESC
      LIMIT 5
    `);

    /* ================= RECENT POSTS ================= */
    const recentPosts = await pool.query(`
      SELECT id, title, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 5
    `);

    /* ================= DAILY ANALYTICS ================= */
    const daily = await pool.query(`
      SELECT date, views
      FROM post_analytics
      ORDER BY date ASC
      LIMIT 30
    `);

    res.json({
      stats: {
        users: users.rows[0].count,
        posts: posts.rows[0].count,
        comments: comments.rows[0].count,
        views: views.rows[0].sum || 0,  /* 🔥 NEW */
  active_subscriptions: subs.rows[0].active,
  expired_subscriptions: subs.rows[0].expired,
  total_revenue: revenue.rows[0].total
      },
      topPosts: topPosts.rows,
      recentPosts: recentPosts.rows,
      daily: daily.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics error" });
  }
};