const Razorpay = require("razorpay");
const crypto = require("crypto");
const pool = require("../config/db");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {

  try {
    const userId = req.user.id;
    const { plan } = req.body;

    const plans = {
      monthly: 100,
      yearly: 100,
    };

    const amount = plans[plan];
    if (!amount) return res.status(400).json({ message: "Invalid plan" });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
    });

  await pool.query(
  `INSERT INTO payments (user_id, razorpay_order_id, amount, status, plan)
   VALUES ($1, $2, $3, 'created', $4)`,
  [userId, order.id, amount, plan]
);

    res.json({ success: true, order });

  } catch (err) {
    console.log(err,"err")
    res.status(500).json({ message: err.message });
  }
};

/* ================= VERIFY PAYMENT (TRANSACTION SAFE) ================= */
exports.verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
const {
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
} = req.body;

    /* 🔐 Signature verification */
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    /* 🔥 START TRANSACTION */
    await client.query("BEGIN");

    /* 🔒 LOCK PAYMENT ROW */
    const { rows } = await client.query(
      `SELECT * FROM payments
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpay_order_id]
    );

    const payment = rows[0];

    if (!payment) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment not found" });
    }
    if (payment.status !== "created") {
  await client.query("ROLLBACK");
  return res.status(400).json({ message: "Invalid payment state" });
}

    /* 🛑 IDEMPOTENCY */
    if (payment.status === "paid") {
      await client.query("COMMIT");
      return res.json({ success: true, message: "Already processed" });
    }
const plan = payment.plan;
    /* ✅ UPDATE PAYMENT */
    await client.query(
      `UPDATE payments
       SET status='paid',
           razorpay_payment_id=$1,
           razorpay_signature=$2
       WHERE id=$3`,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    /* 🧠 SUBSCRIPTION LOGIC */
    const expiresQuery =
      plan === "yearly"
        ? "NOW() + INTERVAL '1 year'"
        : "NOW() + INTERVAL '1 month'";

await client.query(
  `
  INSERT INTO subscriptions (user_id, plan, started_at, expires_at)
  VALUES ($1, $2, NOW(), ${expiresQuery})
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan = EXCLUDED.plan,
    started_at = NOW(),
    expires_at = 
      CASE 
        WHEN subscriptions.expires_at > NOW()
        THEN subscriptions.expires_at + (${expiresQuery} - NOW())
        ELSE ${expiresQuery}
      END
  `,
  [userId, plan]
);

    /* 💰 REVENUE SPLIT */
    const platformCut = payment.amount * 0.3;
    const creatorPool = payment.amount * 0.7;

    await client.query(
      `INSERT INTO platform_revenue (payment_id, total_amount, platform_cut, creator_pool)
       VALUES ($1,$2,$3,$4)`,
      [payment.id, payment.amount, platformCut, creatorPool]
    );

    /* ✅ COMMIT */
    await client.query("COMMIT");

    res.json({ success: true });

  } catch (err) {
    console.log(err,"error coming")
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/* ================= GET MY SUBSCRIPTION ================= */
exports.getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id=$1`,
      [userId]
    );

    res.json({
      success: true,
      data: rows[0] || null,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminListSubscriptions = async (req, res) => {
  try {
    let { page = 1, limit = 10, q = "", plan, status, sort = "expires_at", dir = "asc" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let values = [];

    /* search */
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(u.username ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
    }

    /* plan filter */
    if (plan) {
      values.push(plan);
      conditions.push(`s.plan = $${values.length}`);
    }

    /* status filter */
    if (status === "active") {
      conditions.push(`s.expires_at > NOW()`);
    } else if (status === "expired") {
      conditions.push(`s.expires_at <= NOW()`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    /* count */
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM subscriptions s JOIN users u ON u.id = s.user_id ${where}`,
      values
    );

    const total = parseInt(countRes.rows[0].count);

    /* data */
    values.push(limit, offset);

    const data = await pool.query(
      `
      SELECT 
  
        s.user_id,
        u.username,
        u.email,
        s.plan,
        s.started_at,
        s.expires_at,
        p.amount,
        p.razorpay_payment_id,

        CASE 
          WHEN s.expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as status

      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN payments p ON p.user_id = s.user_id AND p.status='paid'
      ${where}
      ORDER BY ${sort} ${dir}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values
    );

    res.json({
      data: data.rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
};

exports.adminStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE plan='monthly') as monthly,
        COUNT(*) FILTER (WHERE plan='yearly') as yearly
      FROM subscriptions
    `);

    const revenue = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as revenue
      FROM payments
      WHERE status='paid'
    `);

    res.json({
      data: {
        ...stats.rows[0],
        revenue: revenue.rows[0].revenue
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Stats error" });
  }
};
exports.adminExtend = async (req, res) => {
  try {
    const { userId } = req.params;
    const { months = 1 } = req.body;

    await pool.query(
      `
      UPDATE subscriptions
      SET expires_at =
        CASE 
          WHEN expires_at > NOW()
          THEN expires_at + INTERVAL '${months} month'
          ELSE NOW() + INTERVAL '${months} month'
        END
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({ message: "Subscription extended" });

  } catch (err) {
    res.status(500).json({ message: "Extend failed" });
  }
};

exports.adminRevoke = async (req, res) => {
  try {
    const { userId } = req.params;

    /* check subscription exists */
    const sub = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (!sub.rows.length) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    /* already expired */
    if (new Date(sub.rows[0].expires_at) <= new Date()) {
      return res.status(400).json({ message: "Subscription already expired" });
    }

    /* revoke = expire immediately */
    await pool.query(
      `UPDATE subscriptions
       SET expires_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: "Subscription revoked successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Revoke failed" });
  }
};

exports.adminExportCSV = async (req, res) => {
  try {
    const data = await pool.query(`
      SELECT 
        u.username,
        u.email,
        s.plan,
        s.started_at,
        s.expires_at
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);

    const rows = data.rows;

    let csv = "username,email,plan,started_at,expires_at\n";

    rows.forEach(r => {
      csv += `${r.username},${r.email},${r.plan},${r.started_at},${r.expires_at}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=subscriptions.csv");

    res.send(csv);

  } catch (err) {
    res.status(500).json({ message: "Export failed" });
  }
};