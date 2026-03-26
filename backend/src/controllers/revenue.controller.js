const pool = require("../config/db");

/* ================= DISTRIBUTE REVENUE ================= */

exports.distributeRevenue = async (paymentId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* ================= LOCK PAYMENT ================= */

    const paymentResult = await client.query(
      `SELECT id, amount, status 
FROM payments
WHERE id=$1
  AND status = 'paid'
FOR UPDATE`,
      [paymentId]
    );

    if (!paymentResult.rows.length) {
      await client.query("ROLLBACK");
      return;
    }

    const payment = paymentResult.rows[0];
if (!payment) {
  await client.query("ROLLBACK");
  return;
}
    if (payment.status !== "paid") {
      await client.query("ROLLBACK");
      return;
    }

    /* ================= IDEMPOTENCY CHECK ================= */

    const existingDistribution = await client.query(
      `SELECT id FROM platform_revenue WHERE payment_id=$1`,
      [paymentId]
    );

    if (existingDistribution.rows.length) {
      await client.query("ROLLBACK");
      return;
    }

    const totalAmount = Number(payment.amount);

    const platformCut = Number((totalAmount * 0.30).toFixed(2));
    const creatorPool = Number((totalAmount * 0.70).toFixed(2));

    await client.query(
      `INSERT INTO platform_revenue(payment_id, total_amount, platform_cut, creator_pool)
       VALUES($1,$2,$3,$4)`,
      [paymentId, totalAmount, platformCut, creatorPool]
    );

   /* ================= GET TOTAL PREMIUM VIEWS (LAST 30 DAYS) ================= */

const totalViewsResult = await client.query(`
  SELECT COALESCE(SUM(pa.unique_views),0) AS total_views
  FROM post_analytics pa
  JOIN posts p ON pa.post_id = p.id
  WHERE p.is_premium = true
    AND p.status = 'published'
    AND p.deleted = false
    AND pa.date >= NOW() - INTERVAL '30 days'
`);
    const totalViews = Number(totalViewsResult.rows[0].total_views);

    if (!totalViews || totalViews === 0) {
      await client.query("COMMIT");
      return;
    }

/* ================= GET CREATOR VIEW COUNTS (LAST 30 DAYS) ================= */

const creatorViewsResult = await client.query(`
  SELECT p.author_id, COALESCE(SUM(pa.unique_views),0) AS creator_views
  FROM post_analytics pa
  JOIN posts p ON pa.post_id = p.id
  WHERE p.is_premium = true
    AND p.status = 'published'
    AND p.deleted = false
    AND pa.date >= NOW() - INTERVAL '30 days'
  GROUP BY p.author_id
`);

    for (let row of creatorViewsResult.rows) {

      const creatorId = row.author_id;
      const creatorViews = Number(row.creator_views);

      const creatorShare = Number(
        ((creatorViews / totalViews) * creatorPool).toFixed(2)
      );

      if (creatorShare <= 0) continue;

      /* ================= INSERT EARNING ================= */

   await client.query(
  `INSERT INTO creator_earnings(creator_id, post_id, amount, source)
   VALUES($1,$2,$3,'subscription')`,
  [creatorId, null, creatorShare]
);

      /* ================= UPDATE WALLET ================= */

      await client.query(
        `
        INSERT INTO creator_wallets(creator_id, total_earned)
        VALUES($1,$2)
        ON CONFLICT (creator_id)
        DO UPDATE SET
          total_earned = creator_wallets.total_earned + EXCLUDED.total_earned,
          updated_at = NOW()
        `,
        [creatorId, creatorShare]
      );
    }

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Revenue distribution error:", err);
  } finally {
    client.release();
  }
};

/* ================= CREATOR DASHBOARD ================= */

exports.getCreatorEarnings = async (req, res) => {
  try {
    const earnings = await pool.query(
      `SELECT SUM(amount) as total_earnings
       FROM creator_earnings
       WHERE creator_id=$1`,
      [req.user.id]
    );

    res.json({
      total_earnings: earnings.rows[0].total_earnings || 0
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching earnings" });
  }
};


/* ================= ADMIN REVENUE DASHBOARD ================= */

exports.getPlatformRevenue = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(platform_cut) as platform_earnings,
        SUM(creator_pool) as total_creator_pool
      FROM platform_revenue
    `);

    res.json(stats.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Error fetching revenue stats" });
  }
};