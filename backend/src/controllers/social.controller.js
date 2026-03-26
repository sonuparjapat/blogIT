
const pool = require("../config/db");

exports.toggleLike = async (req,res)=>{
const {postId}=req.params;
/* 🔥 check if premium */
const post = await pool.query(
  `SELECT is_premium FROM posts WHERE id=$1`,
  [postId]
);

if (!post.rows.length) {
  return res.status(404).json({ message: "Post not found" });
}

if (post.rows[0].is_premium) {
  const sub = await pool.query(
    `SELECT 1 FROM subscriptions 
     WHERE user_id=$1 AND expires_at > NOW()`,
    [req.user.id]
  );

  if (!sub.rows.length) {
    return res.status(403).json({
      message: "Subscribe to like this post"
    });
  }
}

/* original logic */
await pool.query(
  "INSERT INTO likes(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
  [req.user.id,postId]
);

res.json({ liked:true });
};

exports.toggleBookmark = async (req,res)=>{
const {postId}=req.params;
/* 🔥 check if premium */
const post = await pool.query(
  `SELECT is_premium FROM posts WHERE id=$1`,
  [postId]
);

if (!post.rows.length) {
  return res.status(404).json({ message: "Post not found" });
}

if (post.rows[0].is_premium) {
  const sub = await pool.query(
    `SELECT 1 FROM subscriptions 
     WHERE user_id=$1 AND expires_at > NOW()`,
    [req.user.id]
  );

  if (!sub.rows.length) {
    return res.status(403).json({
      message: "Subscribe to bookmark this post"
    });
  }
}

await pool.query("INSERT INTO bookmarks(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.user.id,postId]);
res.json({bookmarked:true});
};

exports.follow = async (req,res)=>{
const {userId}=req.params;


await pool.query("INSERT INTO followers(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.user.id,userId]);
res.json({following:true});
};
