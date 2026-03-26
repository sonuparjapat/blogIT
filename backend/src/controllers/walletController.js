const pool = require("../config/db");

/* ================= GET WALLET SUMMARY ================= */
exports.getWallet = async (req, res) => {
  try {

    const userId = req?.user?.id;

    const wallet = await pool.query(
      `
     SELECT 
  cw.total_earned,
  cw.total_withdrawn,
  (cw.total_earned - cw.total_withdrawn) AS balance,


  (
    SELECT COALESCE(SUM(amount),0)
    FROM creator_earnings
    WHERE creator_id = $1 AND source = 'subscription'
  ) AS subscription_earnings

FROM creator_wallets cw
WHERE cw.creator_id = $1
      `,
      [userId]
    );

    res.json(
      wallet.rows[0] || {
        total_earned: 0,
        total_withdrawn: 0,
        balance: 0
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Wallet error" });
  }
};


/* ================= GET EARNINGS HISTORY ================= */
exports.getEarnings = async (req, res) => {
  try {
    const userId = req?.user?.id;
console.log(userId,"userssssssssssssssssss")
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    /* total count */
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM creator_earnings WHERE creator_id=$1`,
      [userId]
    );

    const total = parseInt(countRes.rows[0].count);

    /* data */
    const data = await pool.query(
      `
      SELECT 
        ce.id,
        ce.amount,
        ce.source,
        ce.created_at,
        p.title AS post_title
      FROM creator_earnings ce
      LEFT JOIN posts p ON ce.post_id = p.id
      WHERE ce.creator_id = $1
      ORDER BY ce.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    res.json({
      data: data.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Earnings error" });
  }
};