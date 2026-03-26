const pool = require("../config/db");

/* ================= GET PUBLIC PROFILE ================= */

exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await pool.query(
      `SELECT 
  u.id, 
  u.username, 
  u.display_name, 
  u.bio, 
  u.avatar, 
  u.created_at,

  /* 🔥 NEW */
  CASE 
    WHEN s.expires_at IS NOT NULL AND s.expires_at > NOW()
    THEN true
    ELSE false
  END AS is_subscribed

FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.username=$1 AND u.is_banned=false`,
      [username]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const stats = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM posts WHERE author_id=$1 AND status='published') AS total_posts,
        (SELECT COUNT(*) FROM followers WHERE following_id=$1) AS followers,
        (SELECT COUNT(*) FROM followers WHERE follower_id=$1) AS following
       `,
      [user.rows[0].id]
    );

    res.json({
      ...user.rows[0],
      stats: stats.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= UPDATE PROFILE ================= */

exports.updateProfile = async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;

    const updated = await pool.query(
      `UPDATE users
       SET display_name=$1, bio=$2, avatar=$3
       WHERE id=$4
       RETURNING id, username, display_name, bio, avatar`,
      [display_name, bio, avatar, req.user.id]
    );

    res.json(updated.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= FOLLOW USER ================= */

exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    await pool.query(
      `INSERT INTO followers(follower_id, following_id)
       VALUES($1,$2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, userId]
    );

    res.json({ message: "Followed successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= UNFOLLOW USER ================= */

exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      `DELETE FROM followers
       WHERE follower_id=$1 AND following_id=$2`,
      [req.user.id, userId]
    );

    res.json({ message: "Unfollowed successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= GET FOLLOWERS ================= */

exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await pool.query(
      `SELECT u.id, u.username, u.avatar
       FROM followers f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id=$1`,
      [userId]
    );

    res.json(followers.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= GET FOLLOWING ================= */

exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await pool.query(
      `SELECT u.id, u.username, u.avatar
       FROM followers f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id=$1`,
      [userId]
    );

    res.json(following.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};