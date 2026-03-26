const pool = require("../config/db");

/* ================= CREATOR DASHBOARD ================= */
exports.getCreatorAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    /* ===== TOTAL STATS ===== */
const stats = await pool.query(
  `
  SELECT
    (SELECT COALESCE(SUM(ce.amount),0) 
     FROM creator_earnings ce 
     WHERE ce.creator_id=$1) AS total_earnings,

    (SELECT COUNT(*) 
     FROM posts p 
     WHERE p.author_id=$1 AND p.status='published') AS total_posts,

    (SELECT COALESCE(SUM(p.views),0) 
     FROM posts p 
     WHERE p.author_id=$1) AS total_views,

    /* 🔥 NEW: active subscribers */
    (SELECT COUNT(*) 
     FROM subscriptions s
     WHERE s.expires_at > NOW()
    ) AS active_subscribers
  `,
  [userId]
);

    /* ===== EARNINGS CHART (LAST 7 DAYS) ===== */
    const earningsChart = await pool.query(
      `
      SELECT 
        DATE(ce.created_at) as date,
        COALESCE(SUM(ce.amount),0) as earnings
      FROM creator_earnings ce
      WHERE ce.creator_id=$1
      GROUP BY DATE(ce.created_at)
      ORDER BY DATE(ce.created_at) DESC
      LIMIT 7
      `,
      [userId]
    );

    /* ===== VIEWS CHART (LAST 7 DAYS) ===== */
    const viewsChart = await pool.query(
      `
      SELECT 
        pa.date,
        COALESCE(SUM(pa.views),0) as views
      FROM post_analytics pa
      JOIN posts p ON pa.post_id = p.id
      WHERE p.author_id=$1
      GROUP BY pa.date
      ORDER BY pa.date DESC
      LIMIT 7
      `,
      [userId]
    );

    /* ===== TOP POSTS ===== */
    const topPosts = await pool.query(
      `
      SELECT p.title, p.views
      FROM posts p
      WHERE p.author_id=$1
      ORDER BY p.views DESC
      LIMIT 5
      `,
      [userId]
    );

    res.json({
      stats: stats.rows[0],
      earningsChart: earningsChart.rows.reverse(),
      viewsChart: viewsChart.rows.reverse(),
      topPosts: topPosts.rows
    });

  } catch (err) {
    console.error("Creator Analytics Error:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};